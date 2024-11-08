import { Injectable } from '@nestjs/common';
import { AppLogger } from '@/common/app-logger';
import { ExAccountCode } from '@/db/models/exchange-types';
import { ExRestTypes } from '@/exchange/exchange-accounts';
import { ExRestParams } from '@/exchange/base/rest/rest.type';
import { ConfigService } from '@nestjs/config';
import { Config } from '@/common/config.types';
import { ExchangeService } from '@/exchange/rest-types';
import { Path } from '@nestjs/config/dist/types';

@Injectable()
export class ExchangeRestService {
  instMap = new Map<ExAccountCode, ExchangeService>();
  private supportedExAccounts: Set<ExAccountCode>;

  constructor(
    private configService: ConfigService<Config>,
    private logger: AppLogger,
  ) {
    logger.setContext('ex-rest-service');
    this.supportedExAccounts = new Set<ExAccountCode>(
      Object.keys(ExRestTypes) as ExAccountCode[],
    );
  }

  supportExAccount(exAccount: ExAccountCode): boolean {
    return this.supportedExAccounts.has(exAccount);
  }

  getExRest(exAccount: ExAccountCode): ExchangeService | undefined {
    let rest = this.instMap.get(exAccount);
    if (rest) {
      return rest;
    }
    const RestType = ExRestTypes[exAccount];
    if (!RestType) {
      return undefined;
    }
    const socksProxies = this.configService.get('exchange.socksProxies' as any);
    rest = new RestType({
      proxies: socksProxies,
    } as ExRestParams);
    this.instMap.set(exAccount, rest);
    return rest;
  }
}
