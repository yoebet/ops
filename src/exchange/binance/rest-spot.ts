import { BinanceBaseRest } from '@/exchange/binance/rest';
import { ExRestParams, HttpMethodType } from '@/exchange/base/rest/rest.type';
import { ExAccountCode, ExKline, ExTrade } from '@/exchange/exchanges-types';
import {
  FetchKlineParams,
  FetchTradeParams,
  ExchangeService,
} from '@/exchange/rest-capacities';
import {
  CandleRawDataBinance,
  TradeRawDataBinance,
} from '@/exchange/binance/types';
import { RestBody } from '@/exchange/okx/types';

export class BinanceSpotRest
  extends BinanceBaseRest
  implements ExchangeService
{
  constructor(params?: Partial<ExRestParams>) {
    super({
      host: 'api.binance.com',
      exAccount: ExAccountCode.binanceSpot,
      ...params,
    });
  }

  // https://binance-docs.github.io/apidocs/spot/cn/#k
  async getKlines(params: FetchKlineParams): Promise<ExKline[]> {
    const fetchCandleParamBinance = this.toFetchCandleParam(params);
    const resultRaw: CandleRawDataBinance[] = await this.request({
      path: '/api/v3/klines',
      method: HttpMethodType.get,
      params: fetchCandleParamBinance,
    });

    return BinanceBaseRest.toCandles(resultRaw);
  }

  // https://binance-docs.github.io/apidocs/spot/cn/#2c5e424c25
  async getTrades(params: FetchTradeParams): Promise<ExTrade[]> {
    const fetchTradeParamBinance = this.toFetchTradeParam(params);
    const resultRaw: TradeRawDataBinance[] = await this.request({
      path: '/api/v3/trades',
      method: HttpMethodType.get,
      params: fetchTradeParamBinance,
    });

    return this.toTrades(resultRaw, params.symbol);
  }

  async getSymbolInfo(symbol: string): Promise<any> {
    const res: RestBody<any> = await this.request({
      path: '/api/v3/exchangeInfo',
      method: HttpMethodType.get,
      params: { symbol },
    });
    return res['symbols'][0];
  }

  async getPrice(symbol: string): Promise<any> {
    const res: RestBody<any> = await this.request({
      path: '/api/v3/ticker/price',
      method: HttpMethodType.get,
      params: { symbol },
    });
    return res;
  }
}
