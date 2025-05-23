import { Injectable, OnModuleInit } from '@nestjs/common';
import { Exchanges } from '@/exchange/exchanges';
import { AppLogger } from '@/common/app-logger';
import { ExchangeCode, ExMarket } from '@/db/models/exchange-types';
import { ExKline, ExPrice } from '@/exchange/exchange-service.types';
import { KlinesHolder } from '@/data-ex/kline-data-holder';
import { TimeLevel } from '@/db/models/time-level';
import { MINUTE_MS } from '@/common/utils/utils';
import { ExSymbolService } from '@/common-services/ex-symbol.service';
import { ExPublicWsService } from '@/data-ex/ex-public-ws.service';
import { RtPrice } from '@/data-service/models/realtime';
import { KlineParams } from '@/data-service/models/query-params';

const MAX_KEEP_KLINES = 120;

@Injectable()
export class ExPublicDataService implements OnModuleInit {
  private latestPrices = new Map<string, ExPrice>();
  private klineHolders = new Map<string, KlinesHolder>();

  private $lastPrices = new Map<string, Promise<ExPrice>>();

  constructor(
    private exchanges: Exchanges,
    private symbolServices: ExSymbolService,
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
        // this.logger.log(`${key} ${rtPrice.price}`);
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
    let $lastPrice = this.$lastPrices.get(key);
    if (!$lastPrice) {
      const dataService = this.exchanges.getExMarketDataService(ex, es.market);
      $lastPrice = dataService.getPrice(es.rawSymbol);
      this.$lastPrices.set(key, $lastPrice);
    }
    lastPrice = await $lastPrice;
    this.$lastPrices.delete(key);
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
        const fetchCount = Math.ceil((liveOpenTs - tt) / intervalMs) + 1;
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
    liveOpenTs?: number,
  ): Promise<ExKline[]> {
    const dataService = this.exchanges.getExMarketDataService(ex, market);
    const klines = await dataService.getKlines({
      symbol: rawSymbol,
      interval,
      limit: limit + 1,
    });
    const len = klines.length;
    if (len === 0) {
      return [];
    }
    if (len > 1 && klines[0].ts > klines[len - 1].ts) {
      klines.reverse();
    }
    if (liveOpenTs) {
      const lastKl = klines[len - 1];
      if (lastKl.ts >= liveOpenTs) {
        return klines.slice(0, len - 1);
      }
    }
    return klines;
  }

  // old to new
  async fetchKlines(params: KlineParams): Promise<ExKline[]> {
    await this.symbolServices.ensureLoaded();
    const es = this.symbolServices.getExchangeSymbolByES(
      params.ex as ExchangeCode,
      params.symbol,
    );
    const dataService = this.exchanges.getExMarketDataService(
      params.ex as ExchangeCode,
      es.market,
    );
    const klines = await dataService.getKlines({
      symbol: es.rawSymbol,
      interval: params.interval,
      limit: params.limit,
      startTime: params.tsFrom,
      endTime: params.tsTo,
    });
    if (klines.length > 1 && klines[0].ts > klines[klines.length - 1].ts) {
      klines.reverse();
    }
    return klines;
  }
}
