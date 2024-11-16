import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { AppLogger } from '@/common/app-logger';
import {
  ExAccountType,
  ExchangeCode,
  ExMarket,
  ExTradeType,
} from '@/db/models/exchange-types';
import { ConfigService } from '@nestjs/config';
import { Config } from '@/common/config.types';
import {
  ExchangeFacade,
  ExchangeMarketDataService,
  ExchangeMarketDataWs,
  ExchangePrivateDataWs,
  ExchangeTradeService,
} from '@/exchange/exchange-service-types';
import { BinanceExchange } from '@/exchange/binance/binance-exchange';
import { OkxExchange } from '@/exchange/okx/okx-exchange';
import { ExApiKey } from '@/exchange/base/rest/rest.type';

@Injectable()
export class Exchanges implements OnApplicationShutdown {
  private exchangeMap = new Map<ExchangeCode, ExchangeFacade>();

  constructor(
    private configService: ConfigService<Config>,
    private logger: AppLogger,
  ) {
    logger.setContext('ex-services');
    const proxies = this.configService.get('exchange.socksProxies' as any);
    const binanceExchange = new BinanceExchange(configService, { proxies });
    const okxExchange = new OkxExchange(configService, { proxies });
    this.exchangeMap.set(ExchangeCode.binance, binanceExchange);
    this.exchangeMap.set(ExchangeCode.okx, okxExchange);
  }

  private getExchange(ex: ExchangeCode): ExchangeFacade {
    const ef = this.exchangeMap.get(ex);
    if (!ef) {
      throw new Error(`no exchange for ${ex}`);
    }
    return ef;
  }

  getExTradeService(
    ex: ExchangeCode,
    tradeType: ExTradeType,
  ): ExchangeTradeService | undefined {
    return this.getExchange(ex).getExTradeService(tradeType);
  }

  getExAccountType(ex: ExchangeCode, tradeType: ExTradeType): ExAccountType {
    if (ex === ExchangeCode.okx) {
      return ExAccountType.unified;
    }
    return tradeType as any as ExAccountType;
  }

  getExMarketDataService(
    ex: ExchangeCode,
    market: ExMarket,
  ): ExchangeMarketDataService | undefined {
    return this.getExchange(ex).getExMarketDataService(market);
  }

  getExMarketDataWs(
    ex: ExchangeCode,
    market: ExMarket,
  ): ExchangeMarketDataWs | undefined {
    return this.getExchange(ex).getExMarketDataWs(market);
  }

  getExPrivateDataWs(
    apiKey: ExApiKey,
    ex: ExchangeCode,
    tradeType: ExTradeType,
  ): ExchangePrivateDataWs | undefined {
    return this.getExchange(ex).getExPrivateDataWs(apiKey, tradeType);
  }

  onApplicationShutdown(_signal?: string): any {
    this.logger.warn(`shutdown ...`);
    this.exchangeMap.forEach((e) => e.shutdown());
  }
}
