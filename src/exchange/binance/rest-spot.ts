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
  TradeRawDataBinance,
} from '@/exchange/binance/rest.type';
import { ExAccountCode, ExTrade } from '@/exchange/exchanges-types';

export class BinanceSpotRest extends BinanceBaseRest {
  constructor(params?: Partial<ExRestParams>) {
    super({
      host: 'api.binance.com',
      exAccount: ExAccountCode.binanceSpotMargin,
      ...params,
    });
  }

  async getCandlesticks(params: FetchCandleParam): Promise<Candle[]> {
    const fetchCandleParamBinance = this.toFetchCandleParam(params);
    const resultRaw: CandleRawDataBinance[] = await this.request({
      path: '/api/v3/klines',
      method: HttpMethodType.get,
      params: fetchCandleParamBinance,
    });

    return this.toCandles(resultRaw);
  }

  // https://binance-docs.github.io/apidocs/spot/cn/#2c5e424c25
  async getTrades(params: FetchTradeParam): Promise<ExTrade[]> {
    const fetchTradeParamBinance = this.toFetchTradeParam(params);
    const resultRaw: TradeRawDataBinance[] = await this.request({
      path: '/api/v3/trades',
      method: HttpMethodType.get,
      params: fetchTradeParamBinance,
    });

    return this.toTrades(resultRaw, params.symbol);
  }

  async getHistoryTrades(params: FetchHistoryTradeParam): Promise<ExTrade[]> {
    const fetchTradeParamBinance = this.toFetchHistoryTradeParam(params);
    const resultRaw: TradeRawDataBinance[] = await this.request({
      path: '/api/v3/historicalTrades',
      method: HttpMethodType.get,
      params: fetchTradeParamBinance,
    });

    return this.toTrades(resultRaw, params.symbol);
  }
}
