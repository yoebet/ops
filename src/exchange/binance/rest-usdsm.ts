import { BinanceBaseRest } from '@/exchange/binance/rest';
import {
  Candle,
  ExRestParams,
  FetchCandleParam,
  FetchHistoryTradeParam,
  FetchTradeParam,
  HttpMethodType,
} from '@/exchange/base/rest/rest.type';
import {
  CandleRawDataBinance,
  TradeRawDataBinance,
} from '@/exchange/binance/rest.type';
import { ExAccountCode, ExTrade } from '@/exchange/exchanges-types';

/**
 * https://binance-docs.github.io/apidocs/futures/cn
 */
export class BinanceUsdMRest extends BinanceBaseRest {
  constructor(params?: Partial<ExRestParams>) {
    super({
      host: 'fapi.binance.com',
      exAccount: ExAccountCode.binanceUsdM,
      ...params,
    });
  }

  // K线数据 https://binance-docs.github.io/apidocs/futures/cn/#k
  async getCandlesticks(params: FetchCandleParam): Promise<Candle[]> {
    const fetchCandleParamBinance = this.toFetchCandleParam(params);
    const resultRaw: CandleRawDataBinance[] = await this.request({
      path: '/fapi/v1/historicalTrades',
      method: HttpMethodType.get,
      params: fetchCandleParamBinance,
    });
    return this.toCandles(resultRaw);
  }

  // https://binance-docs.github.io/apidocs/delivery/cn/#404aacd9b3
  async getTrades(params: FetchTradeParam): Promise<ExTrade[]> {
    const fetchTradeParamBinance = this.toFetchTradeParam(params);
    const resultRaw: TradeRawDataBinance[] = await this.request({
      path: '/fapi/v1/trades',
      method: HttpMethodType.get,
      params: fetchTradeParamBinance,
    });

    return this.toTrades(resultRaw, params.symbol);
  }

  async getHistoryTrades(params: FetchHistoryTradeParam): Promise<ExTrade[]> {
    // need API-key
    const fetchTradeParamBinance = this.toFetchHistoryTradeParam(params);
    const resultRaw: TradeRawDataBinance[] = await this.request({
      path: '/fapi/v1/historicalTrades',
      method: HttpMethodType.get,
      params: fetchTradeParamBinance,
    });
    return this.toTrades(resultRaw, params.symbol);
  }
}
