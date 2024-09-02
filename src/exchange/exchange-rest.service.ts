import { Injectable } from '@nestjs/common';
import { AppLogger } from '@/common/app-logger';
import { ExRest } from '@/exchange/base/rest/ex-rest';
import { ExAccountCode } from '@/exchange/exchanges-types';
import { ExRestTypes } from '@/exchange/exchange-accounts';
import { ExRestParams } from '@/exchange/base/rest/rest.type';
import { ConfigService } from '@nestjs/config';
import { Config } from '@/common/config.types';

@Injectable()
export class ExchangeRestService {
  instMap = new Map<ExAccountCode, ExRest>();
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

  getExRest(exAccount: ExAccountCode): ExRest | undefined {
    let rest = this.instMap.get(exAccount);
    if (rest) {
      return rest;
    }
    const RestType = ExRestTypes[exAccount];
    if (!RestType) {
      return undefined;
    }
    const restAgents = this.configService.get<string[]>('restAgents');
    rest = new RestType({
      proxies: restAgents,
    } as ExRestParams);
    this.instMap.set(exAccount, rest);
    return rest;
  }
}
