import { BinanceBaseRest } from '@/exchange/binance/rest';
import { ExRestParams, HttpMethodType } from '@/exchange/base/rest/rest.type';
import { ExAccountCode } from '@/db/models/exchange-types';
import {
  FetchKlineParams,
  FetchTradeParams,
  ExchangeService,
  ExPrice,
  ExKline,
  ExTrade,
} from '@/exchange/rest-types';
import {
  CandleRawDataBinance,
  TradeRawDataBinance,
} from '@/exchange/binance/types';

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
    const res: any = await this.request({
      path: '/api/v3/exchangeInfo',
      method: HttpMethodType.get,
      params: {
        symbol,
        // symbols
        showPermissionSets: false,
      },
    });
    return res['symbols'][0];
  }

  async getPrice(symbol: string): Promise<ExPrice> {
    const res: any = await this.request({
      path: '/api/v3/ticker/price',
      method: HttpMethodType.get,
      params: { symbol },
    });
    return { last: +res.price };
  }
}
