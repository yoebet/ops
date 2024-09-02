import { BinanceBaseRest } from '@/exchange/binance/rest';
import {
  ExRestParams,
  Candle,
  FetchCandleParam,
  FetchHistoryTradeParam,
  FetchTradeParam,
  HttpMethodType,
} from '@/exchange/base/rest/rest.type';
import {
  CandleRawDataBinance,
  TradeRawDataBinanceCoinM,
} from '@/exchange/binance/rest.type';
import {
  ExAccountCode,
  ExchangeCode,
  ExTrade,
} from '@/exchange/exchanges-types';
import { sortExTrade } from '@/exchange/base/base.type';
import { TradeSide } from '@/db/models-data/base';

/**
 * https://binance-docs.github.io/apidocs/delivery/cn
 */
export class BinanceCoinMRest extends BinanceBaseRest {
  constructor(params?: Partial<ExRestParams>) {
    super({
      host: 'dapi.binance.com',
      exAccount: ExAccountCode.binanceCoinM,
      ...params,
    });
  }

  // K线数据 https://binance-docs.github.io/apidocs/delivery/cn/#k
  async getCandlesticks(params: FetchCandleParam): Promise<Candle[]> {
    const fetchCandleParamBinance = this.toFetchCandleParam(params);
    const resultRaw: CandleRawDataBinance[] = await this.request({
      path: '/dapi/v1/klines',
      method: HttpMethodType.get,
      params: fetchCandleParamBinance,
    });
    return this.toCandles(resultRaw);
  }

  private _toTrades(
    data: TradeRawDataBinanceCoinM[],
    symbol: string,
  ): ExTrade[] {
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
        size: +line.qty, //反向 这里填写U金额
        side: line.isBuyerMaker ? TradeSide.buy : TradeSide.sell,
        ts: +line.time,
      };
      trades.push(trade);
    }
    return trades.sort(sortExTrade);
  }

  // https://binance-docs.github.io/apidocs/delivery/cn/#404aacd9b3
  async getTrades(params: FetchTradeParam): Promise<ExTrade[]> {
    const fetchTradeParamBinance = this.toFetchTradeParam(params);
    const resultRaw: TradeRawDataBinanceCoinM[] = await this.request({
      path: '/dapi/v1/trades',
      method: HttpMethodType.get,
      params: fetchTradeParamBinance,
    });

    return this._toTrades(resultRaw, params.symbol);
  }

  async getHistoryTrades(params: FetchHistoryTradeParam): Promise<ExTrade[]> {
    // need API-key
    const fetchTradeParamBinance = this.toFetchHistoryTradeParam(params);
    const resultRaw: TradeRawDataBinanceCoinM[] = await this.request({
      path: '/dapi/v1/historicalTrades',
      method: HttpMethodType.get,
      params: fetchTradeParamBinance,
    });

    return this._toTrades(resultRaw, params.symbol);
  }
}
