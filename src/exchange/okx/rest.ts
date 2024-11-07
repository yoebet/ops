import { ExRest } from '@/exchange/base/rest/ex-rest';
import { includes } from 'lodash';
import {
  ExRestParams,
  ExRestReqBuildParams,
  ExRestReqConfig,
  HttpMethodType,
} from '@/exchange/base/rest/rest.type';
import {
  ExAccountCode,
  ExchangeCode,
  ExKline,
  ExTrade,
} from '@/exchange/exchanges-types';
import { sortExTrade } from '@/exchange/base/base.type';
import { TradeSide } from '@/db/models-data/base';
import {
  FetchKlineParams,
  HistoryTradeParams,
  FetchTradeParams,
  ExchangeService,
} from '@/exchange/rest-capacities';
import {
  CandleRawDataOkx,
  RestBody,
  TradeRawDataOkx,
} from '@/exchange/okx/types';

/**
 * https://www.okx.com/docs-v5/zh/
 */
export class OkxRest extends ExRest implements ExchangeService {
  constructor(params?: Partial<ExRestParams>) {
    super({
      host: 'www.okx.com',
      exAccount: ExAccountCode.okxUnified,
      ...params,
    });
  }

  protected async buildReq(p: ExRestReqBuildParams): Promise<ExRestReqConfig> {
    const { method, path, params, headers } = p;

    const reqHeaders = {
      'Content-Type': 'application/json; charset=UTF-8',
      // 默认的是 axios。okx 会把它当成是 ios 而过滤掉一些参数（例如 reduceOnly）
      'User-Agent': 'hxr',
      'accept-language': 'en-US', // accept-language: en-US,zh-CN
    };
    for (const key in headers) {
      reqHeaders[key] = headers[key];
    }

    let paramsStr: string | undefined, bodyStr: string | undefined;
    if (includes([HttpMethodType.get, HttpMethodType.delete], method)) {
      paramsStr = this.urlParamsStr(params, true);
    } else {
      bodyStr = this.jsonBody(params);
    }

    return {
      method: method,
      url: this.url(p) + (paramsStr ?? ''),
      headers: reqHeaders,
      data: bodyStr,
    };
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

  protected toFetchCandleParams(params: FetchKlineParams): Record<string, any> {
    return {
      instId: params.symbol,
      bar: OkxRest.toCandleInv(params.interval),
      before: params.startTime,
      after: params.endTime,
      limit: params.limit,
    };
  }

  protected toFetchTradeParams(params: FetchTradeParams): Record<string, any> {
    const para = {
      instId: params.symbol,
      limit: params?.limit || 500,
    };
    return para;
  }

  protected toFetchHistoryTradeParams(
    params: HistoryTradeParams,
  ): Record<string, any> {
    let para: any = {
      instId: params.symbol,
      type: '1', //按tradeId
      limit: '100',
    };
    if (params.limit) {
      para = {
        ...para,
        limit: String(params.limit),
      };
    }
    if (params.fromId) {
      para.before = params.fromId;
    }
    if (params.toId) {
      para.after = params.toId;
    }

    return para;
  }

  static toCandles(data: CandleRawDataOkx[]): ExKline[] {
    if (!data) {
      return undefined;
    }
    const candles: ExKline[] = [];
    for (const candleRaw of data) {
      const candle: ExKline = {
        ts: Number(candleRaw[0]),
        open: Number(candleRaw[1]),
        high: Number(candleRaw[2]),
        low: Number(candleRaw[3]),
        close: Number(candleRaw[4]),
        size: Number(candleRaw[6]),
        amount: Number(candleRaw[7]),
        bs: 0,
        ba: 0,
        ss: 0,
        sa: 0,
        tds: 0,
      };
      candles.push(candle);
    }
    return candles;
  }

  protected _toTrades(data: TradeRawDataOkx[], symbol: string): ExTrade[] {
    if (!data) {
      return undefined;
    }
    const trades: ExTrade[] = [];
    for (const line of data) {
      const trade: ExTrade = {
        ex: ExchangeCode.okx,
        exAccount: this.exAccount,
        rawSymbol: symbol,
        tradeId: line.tradeId,
        price: +line.px,
        size: +line.sz,
        side: line.side == 'buy' ? TradeSide.buy : TradeSide.sell,
        ts: +line.ts,
      };
      trades.push(trade);
    }
    return trades.sort(sortExTrade);
  }

  // https://www.okx.com/docs-v5/zh/#order-book-trading-market-data-get-trades
  async getTrades(params: FetchTradeParams): Promise<ExTrade[]> {
    const fetchTradeParam = this.toFetchTradeParams(params);
    const resultRaw: RestBody<TradeRawDataOkx[]> = await this.request({
      path: '/api/v5/market/trades',
      method: HttpMethodType.get,
      params: fetchTradeParam,
    });

    return this._toTrades(resultRaw.data, params.symbol);
  }

  async getHistoryTrades(params: HistoryTradeParams): Promise<ExTrade[]> {
    const fetchTradeParam = this.toFetchHistoryTradeParams(params);
    const resultRaw: RestBody<TradeRawDataOkx[]> = await this.request({
      path: '/api/v5/market/history-trades',
      method: HttpMethodType.get,
      params: fetchTradeParam,
    });

    return this._toTrades(resultRaw.data, params.symbol);
  }

  // 获取交易产品K线数据 https://www.okx.com/docs-v5/zh/#order-book-trading-market-data-get-candlesticks
  async getKlines(params: FetchKlineParams): Promise<ExKline[]> {
    // latest 1440
    // 限速：40次/2s
    // limit 最大300，默认100
    const fetchCandleParamOkx = this.toFetchCandleParams(params);
    const resultRaw: RestBody<CandleRawDataOkx[]> = await this.request({
      path: '/api/v5/market/candles',
      method: HttpMethodType.get,
      params: fetchCandleParamOkx,
    });
    return OkxRest.toCandles(resultRaw.data);
  }
}
