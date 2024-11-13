import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { AppLogger } from '@/common/app-logger';
import {
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
  ExchangeTradeService,
} from '@/exchange/exchange-service-types';
import { BinanceExchange } from '@/exchange/binance/binance-exchange';
import { OkxExchange } from '@/exchange/okx/okx-exchange';

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

  getExTradeService(
    ex: ExchangeCode,
    tradeType: ExTradeType,
  ): ExchangeTradeService | undefined {
    return this.exchangeMap.get(ex)?.getExTradeService(tradeType);
  }

  getExMarketDataService(
    ex: ExchangeCode,
    market: ExMarket,
  ): ExchangeMarketDataService | undefined {
    return this.exchangeMap.get(ex)?.getExMarketDataService(market);
  }

  getExMarketDataWs(
    ex: ExchangeCode,
    market: ExMarket,
  ): ExchangeMarketDataWs | undefined {
    return this.exchangeMap.get(ex)?.getExMarketDataWs(market);
  }

  onApplicationShutdown(_signal?: string): any {
    this.logger.warn(`shutdown ...`);
    this.exchangeMap.forEach((e) => e.shutdown());
  }
}
