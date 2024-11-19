import { Injectable } from '@nestjs/common';
import { Exchanges } from '@/exchange/exchanges';
import { AppLogger } from '@/common/app-logger';
import { ExchangeCode, ExMarket } from '@/db/models/exchange-types';
import { ExKline } from '@/exchange/exchange-service-types';

@Injectable()
export class ExPublicDataService {
  private latestPrices = new Map<string, { last: number; ts: number }>();

  constructor(
    private exchanges: Exchanges,
    private logger: AppLogger,
  ) {
    logger.setContext('ex-public-data');
  }

  async getLastPrice(
    ex: ExchangeCode,
    market: ExMarket,
    rawSymbol: string,
    cacheTimeLimit = 5000,
  ): Promise<number> {
    const key = `${ex}:${market}:${rawSymbol}`;
    let lastPrice = this.latestPrices.get(key);
    if (lastPrice && Date.now() - lastPrice.ts <= cacheTimeLimit) {
      return lastPrice.last;
    }
    const dataService = this.exchanges.getExMarketDataService(ex, market);
    lastPrice = await dataService.getPrice(rawSymbol);
    this.latestPrices.set(key, lastPrice);
    return lastPrice.last;
  }

  // okx: 1m+
  // binance: 1s+
  // old to new
  async getLatestKlines(
    ex: ExchangeCode,
    market: ExMarket,
    rawSymbol: string,
    interval: string,
    limit = 60,
  ): Promise<ExKline[]> {
    const dataService = this.exchanges.getExMarketDataService(ex, market);
    let klines = await dataService.getKlines({
      symbol: rawSymbol,
      interval,
      limit,
    });
    if (klines.length > 0) {
      if (klines[0].ts > klines[klines.length - 1].ts) {
        klines = klines.reverse();
      }
    }
    return klines;
  }
}
