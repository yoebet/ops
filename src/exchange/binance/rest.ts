import { ExRest } from '@/exchange/base/rest/ex-rest';
import {
  ExRestReqBuildParams,
  ExRestReqConfig,
} from '@/exchange/base/rest/rest.type';
import { ExchangeCode, ExKline, ExTrade } from '@/exchange/exchanges-types';
import { sortExTrade } from '@/exchange/base/base.type';
import { TradeSide } from '@/db/models-data/base';
import {
  FetchKlineParams,
  HistoryTradeParams,
  FetchTradeParams,
} from '@/exchange/rest-capacities';
import {
  CandleRawDataBinance,
  TradeRawDataBinance,
} from '@/exchange/binance/types';

export abstract class BinanceBaseRest extends ExRest {
  protected async buildReq(p: ExRestReqBuildParams): Promise<ExRestReqConfig> {
    const { method, params, headers } = p;

    const paramsStr = this.urlParamsStr({
      ...params,
    });

    const url = this.url(p) + '?' + paramsStr;
    const reqHeaders = {
      'Content-Type': 'application/json; charset=UTF-8',
    };
    // if (this.api_key) {
    //   reqHeaders['X-MBX-APIKEY'] = this.api_key;
    // }
    for (const key in headers) {
      reqHeaders[key] = headers[key];
    }

    return {
      method: method,
      url: url,
      headers: reqHeaders,
    };
  }

  static toCandleInv(inv: string): string {
    return inv === '1o' ? '1mo' : inv;
  }

  protected toFetchCandleParam(params: FetchKlineParams): Record<string, any> {
    return {
      symbol: params.symbol,
      interval: BinanceBaseRest.toCandleInv(params.interval),
      startTime: params.startTime,
      endTime: params.endTime,
      limit: params.limit,
    };
  }

  protected toFetchTradeParam(params: FetchTradeParams): Record<string, any> {
    const para = {
      symbol: params.symbol,
      limit: params.limit ? params.limit : 1000,
    };
    return para; //返回最新数据
  }

  protected toFetchHistoryTradeParam(
    params: HistoryTradeParams,
  ): Record<string, any> {
    const para = {
      symbol: params.symbol,
      limit: params.limit ? params.limit : 1000,
    };
    if (params.fromId && +params.fromId > 0) {
      return {
        ...para,
        fromId: Number(params.fromId) + 1,
      };
    } else {
      return para; //返回最新数据
    }
  }

  static toCandles(data: CandleRawDataBinance[]): ExKline[] {
    if (!data) {
      return undefined;
    }
    const candles: ExKline[] = [];
    for (const raw of data) {
      const candle: ExKline = {
        ts: Number(raw[0]),
        open: Number(raw[1]),
        high: Number(raw[2]),
        low: Number(raw[3]),
        close: Number(raw[4]),
        size: Number(raw[5]),
        amount: Number(raw[7]),
        bs: Number(raw[9]),
        ba: Number(raw[10]),
        ss: Number(raw[5]) - Number(raw[9]),
        sa: Number(raw[7]) - Number(raw[10]),
        tds: Number(raw[8]),
      };
      candles.push(candle);
    }
    return candles;
  }

  protected toTrades(data: TradeRawDataBinance[], symbol: string): ExTrade[] {
    if (!data) {
      return undefined;
    }
    const trades: ExTrade[] = [];
    for (const line of data) {
      const trade: ExTrade = {
        ex: ExchangeCode.binance,
        exAccount: this.exAccount,
        rawSymbol: symbol,
        tradeId: String(line.id),
        price: +line.price,
        size: +line.qty,
        amount: +line.quoteQty,
        side: line.isBuyerMaker ? TradeSide.buy : TradeSide.sell,
        ts: +line.time,
      };
      trades.push(trade);
    }
    return trades.sort(sortExTrade);
  }
}
