import { ExRestParams, HttpMethodType } from '@/exchange/base/rest/rest.type';
import { BinanceSpotRest } from '@/exchange/binance/rest-spot';
import {
  BaseExchange,
  ExKline,
  ExPrice,
  FetchKlineParams,
} from '@/exchange/rest-types';
import { BinanceBaseRest } from '@/exchange/binance/rest';
import { Candle } from '@/exchange/binance/types';

export class BinanceSpotExchange extends BaseExchange {
  rest: BinanceSpotRest;

  constructor(params?: Partial<ExRestParams>) {
    super();
    this.rest = new BinanceSpotRest(params);
  }

  static toKline(raw: Candle): ExKline {
    return {
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
  }

  // https://binance-docs.github.io/apidocs/spot/cn/#k
  async getKlines(params: FetchKlineParams): Promise<ExKline[]> {
    const resultRaw: Candle[] = await this.rest.request({
      path: '/api/v3/klines',
      method: HttpMethodType.get,
      params: {
        symbol: params.symbol,
        interval: BinanceBaseRest.toCandleInv(params.interval),
        startTime: params.startTime,
        endTime: params.endTime,
        limit: params.limit,
      },
    });
    if (!resultRaw) {
      return [];
    }

    return resultRaw.map(BinanceSpotExchange.toKline);
  }

  async getSymbolInfo(symbol: string): Promise<any> {
    const res: any = await this.rest.request({
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
    const res: any = await this.rest.request({
      path: '/api/v3/ticker/price',
      method: HttpMethodType.get,
      params: { symbol },
    });
    return { last: +res.price };
  }
}
