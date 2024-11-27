import { Injectable, OnModuleInit } from '@nestjs/common';
import { Exchanges } from '@/exchange/exchanges';
import { AppLogger } from '@/common/app-logger';
import { ExchangeCode, ExMarket } from '@/db/models/exchange-types';
import { ExKline, ExPrice } from '@/exchange/exchange-service.types';
import { KlinesHolder } from '@/data-ex/kline-data-holder';
import { TimeLevel } from '@/db/models/time-level';
import { MINUTE_MS } from '@/common/utils/utils';
import { SymbolService } from '@/common-services/symbol.service';
import { ExPublicWsService } from '@/data-ex/ex-public-ws.service';
import { RtPrice } from '@/data-service/models/realtime';

const MAX_KEEP_KLINES = 120;

@Injectable()
export class ExPublicDataService implements OnModuleInit {
  private latestPrices = new Map<string, ExPrice>();
  private klineHolders = new Map<string, KlinesHolder>();

  private $lastPrice: Promise<ExPrice>;

  constructor(
    private exchanges: Exchanges,
    private symbolServices: SymbolService,
    private exPublicWsService: ExPublicWsService,
    private logger: AppLogger,
  ) {
    logger.setContext('ex-public-data');
  }

  onModuleInit(): any {
    setInterval(() => {
      for (const h of this.klineHolders.values()) {
        h.keepLatest(MAX_KEEP_KLINES);
      }
    }, 10 * MINUTE_MS);

    this.exPublicWsService.addRtPriceTap(
      'ExPublicDataService',
      async (rtPrice: RtPrice) => {
        const key = `${rtPrice.ex}:${rtPrice.symbol}`;
        this.latestPrices.set(key, { ts: rtPrice.ts, last: rtPrice.price });
      },
    );
  }

  async getLastPrice(
    ex: ExchangeCode,
    symbol: string,
    cacheTimeLimit = 5000,
  ): Promise<number> {
    await this.symbolServices.ensureLoaded();
    const es = this.symbolServices.getExchangeSymbolByES(ex, symbol);
    if (!es) {
      throw new Error(`ExchangeSymbol not found: ${ex}, ${symbol}`);
    }
    const key = `${ex}:${es.symbol}`;
    let lastPrice = this.latestPrices.get(key);
    if (lastPrice && Date.now() - lastPrice.ts <= cacheTimeLimit) {
      return lastPrice.last;
    }
    const dataService = this.exchanges.getExMarketDataService(ex, es.market);
    if (!this.$lastPrice) {
      this.$lastPrice = dataService.getPrice(es.rawSymbol);
    }
    lastPrice = await this.$lastPrice;
    this.$lastPrice = undefined;
    this.latestPrices.set(key, lastPrice);
    return lastPrice.last;
  }

  // okx: 1m+
  // binance: 1s+

  async getLatestKlines(
    ex: ExchangeCode,
    symbol: string,
    interval: string,
    limit = 60,
  ): Promise<ExKline[]> {
    await this.symbolServices.ensureLoaded();
    const es = this.symbolServices.getExchangeSymbolByES(ex, symbol);
    if (!es) {
      throw new Error(`ExchangeSymbol not found: ${ex}, ${symbol}`);
    }

    const scopeKey = `${ex}:${symbol}:${interval}`;
    const intervalSeconds = TimeLevel.evalIntervalSeconds(interval);
    const intervalMs = intervalSeconds * 1000;
    const now = Date.now();
    const liveOpenTs = now - (now % intervalMs);
    const latestOpenTs = liveOpenTs - intervalMs;

    let holder = this.klineHolders.get(scopeKey);
    if (holder) {
      const tt = holder.getLastTs();
      if (tt) {
        if (tt >= latestOpenTs && holder.data.length >= limit) {
          return holder.getLatest(limit);
        }
        const fetchCount = Math.ceil((latestOpenTs - tt) / intervalMs) + 1;
        const data = await this.fetchLatestKlines(
          ex,
          es.market,
          es.rawSymbol,
          interval,
          fetchCount,
        );
        holder.append(data, { duplicated: true });
        return holder.getLatest(limit);
      }
    }
    const data = await this.fetchLatestKlines(
      ex,
      es.market,
      es.rawSymbol,
      interval,
      limit,
    );
    holder = new KlinesHolder();
    holder.data = data;
    this.klineHolders.set(scopeKey, holder);
    return holder.getLatest(limit);
  }

  // old to new
  private async fetchLatestKlines(
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
