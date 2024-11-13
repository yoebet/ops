import { Injectable } from '@nestjs/common';
import { AppLogger } from '@/common/app-logger';
import {
  ExchangeCode,
  ExMarket,
  ExTradeType,
} from '@/db/models/exchange-types';
import { ExTradeServices } from '@/exchange/exchange-services';
import { ExRestParams } from '@/exchange/base/rest/rest.type';
import { ConfigService } from '@nestjs/config';
import { Config } from '@/common/config.types';
import {
  ExchangeMarketDataService,
  ExchangeTradeService,
} from '@/exchange/exchange-service-types';

@Injectable()
export class ExchangeServiceLocator {
  private tradeInstMap = new Map<string, ExchangeTradeService>();

  constructor(
    private configService: ConfigService<Config>,
    private logger: AppLogger,
  ) {
    logger.setContext('ex-rest-service');
  }

  getExTradeService(
    ex: ExchangeCode,
    tradeType: ExTradeType,
  ): ExchangeTradeService | undefined {
    const key = `${ex}-${tradeType}`;
    let rest = this.tradeInstMap.get(key);
    if (rest) {
      return rest;
    }
    const RestType = ExTradeServices[ex]?.[tradeType];
    if (!RestType) {
      return undefined;
    }
    const socksProxies = this.configService.get('exchange.socksProxies' as any);
    rest = new RestType({
      proxies: socksProxies,
    } as ExRestParams);
    this.tradeInstMap.set(key, rest);
    return rest;
  }

  getExMarketDataService(
    ex: ExchangeCode,
    market: ExMarket,
  ): ExchangeMarketDataService | undefined {
    return undefined;
  }
}
