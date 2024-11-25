import {
  ExchangeMarketDataService,
  ExKline,
  ExPrice,
  FetchKlineParams,
  HistoryKlinesByDayParams,
  HistoryKlinesByMonthParams,
} from '@/exchange/exchange-service-types';
import { OkxRest } from '@/exchange/okx/rest';
import { CandleRaw } from '@/exchange/okx/types';
import { AppLogger } from '@/common/app-logger';
import { ExRestParams } from '@/exchange/base/rest/rest.type';
import { DateTime } from 'luxon';
import { TimeLevel } from '@/db/models/time-level';
import { wait } from '@/common/utils/utils';

export class OkxMarketData implements ExchangeMarketDataService {
  protected rest: OkxRest;
  protected readonly logger: AppLogger;

  constructor(params?: Partial<ExRestParams>) {
    this.rest = new OkxRest(params);
    this.logger = params.logger || AppLogger.build(this.constructor.name);
  }

  static toCandleInv(inv: string): string {
    // [1s/1m/3m/5m/15m/30m/1H/2H/4H]
    // 香港时间开盘价k线：[6H/12H/1D/2D/3D/1W/1M/3M]
    // UTC时间开盘价k线：[6Hutc/12Hutc/1Dutc/2Dutc/3Dutc/1Wutc/1Mutc/3Mutc]
    const u = inv.charAt(inv.length - 1);
    if (u === 'o') {
      inv = inv.substring(0, inv.length - 1) + 'M';
    }
    if (!['s', 'm'].includes(u)) {
      inv = inv.toUpperCase();
    }
    if (['d', 'w', 'o'].includes(u)) {
      return inv + 'utc';
    }
    return inv;
  }

  static toKline(raw: CandleRaw): ExKline {
    return {
      ts: Number(raw[0]),
      open: Number(raw[1]),
      high: Number(raw[2]),
      low: Number(raw[3]),
      close: Number(raw[4]),
      size: Number(raw[5]),
      amount: Number(raw[7]),
      // bs: 0,
      // ba: 0,
      // ss: 0,
      // sa: 0,
      // tds: 0,
    };
  }

  // 获取交易产品K线数据 https://www.okx.com/docs-v5/zh/#order-book-trading-market-data-get-candlesticks
  async getKlines(params: FetchKlineParams): Promise<ExKline[]> {
    const candles: CandleRaw[] = await this.rest.getCandles({
      instId: params.symbol,
      bar: OkxMarketData.toCandleInv(params.interval),
      before: params.startTime,
      after: params.endTime,
      limit: params.limit,
    });
    if (!candles) {
      return [];
    }
    return candles.map(OkxMarketData.toKline);
  }

  async getSymbolInfo(symbol: string): Promise<any> {
    const res = await this.rest.getMarkets({
      instType: 'SPOT',
      instId: symbol,
    });
    return res[0];
  }

  async getPrice(symbol: string): Promise<ExPrice> {
    const tickers = await this.rest.getTicker({ instId: symbol });
    const t = tickers[0];
    return { last: +t.last, ts: +t.ts };
  }

  async loadHistoryKlinesOneMonth(
    params: HistoryKlinesByMonthParams,
  ): Promise<ExKline[]> {
    const { symbol, interval, yearMonth } = params;
    const monthBegin = DateTime.fromFormat(yearMonth, 'yyyy-MM', {
      zone: 'UTC',
    });
    const monthEnd = monthBegin.plus({ month: 1 });

    return this.collectHistoryKlines(interval, symbol, monthBegin, monthEnd);
  }

  protected toFetchCandleParams(params: FetchKlineParams): Record<string, any> {
    return {
      instId: params.symbol,
      bar: OkxMarketData.toCandleInv(params.interval),
      before: params.startTime,
      after: params.endTime,
      limit: params.limit,
    };
  }

  async loadHistoryKlinesOneDay(
    params: HistoryKlinesByDayParams,
  ): Promise<ExKline[]> {
    const { symbol, interval, date } = params;
    const dayBegin = DateTime.fromFormat(date, 'yyyy-MM-dd', {
      zone: 'UTC',
    });
    const dayEnd = dayBegin.plus({ day: 1 });

    return this.collectHistoryKlines(interval, symbol, dayBegin, dayEnd);
  }

  // https://www.okx.com/docs-v5/zh/#order-book-trading-market-data-get-candlesticks-history
  protected async collectHistoryKlines(
    interval: string,
    symbol: string,
    startTime: DateTime,
    endTime: DateTime,
  ): Promise<ExKline[]> {
    const limit = 100; // limit 最大100，默认100
    const rateLimitWait = 200; // Rate Limit: 20 requests per 2 seconds
    const intervalSeconds = TimeLevel.evalIntervalSeconds(interval);
    const intervalMillis = intervalSeconds * 1000;
    const eachTsRange = limit * intervalMillis;

    const startTs0 = startTime.toMillis() - intervalMillis / 2;
    const endTs0 = endTime.toMillis();

    let startTs = startTs0;
    let endTs = startTs + eachTsRange;
    if (endTs > endTs0) {
      endTs = endTs0;
    }

    let klines: ExKline[] = [];

    while (startTs < endTs0) {
      // this.logger.log(
      //   `${new Date(startTs).toISOString()} - ${new Date(endTs).toISOString()}`,
      // );
      const rawData: CandleRaw[] = await this.rest.getHistoryCandles({
        instId: symbol,
        bar: OkxMarketData.toCandleInv(interval),
        before: startTs,
        after: endTs,
        limit: limit,
      });

      await wait(rateLimitWait);

      const kls = rawData.map(OkxMarketData.toKline);
      klines = klines.concat(kls.reverse());
      this.logger.log(`got: ${rawData.length}`);

      startTs = endTs;
      endTs = endTs + eachTsRange;
      if (endTs > endTs0) {
        endTs = endTs0;
      }
    }

    return klines;
  }
}
