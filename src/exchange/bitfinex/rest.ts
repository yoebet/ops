import { ExRest } from '@/exchange/base/rest/ex-rest';
import {
  ExRestParams,
  Candle,
  ExRestReqBuildParams,
  ExRestReqConfig,
  FetchCandleParam,
  FetchHistoryTradeParam,
  FetchTradeParam,
} from '@/exchange/base/rest/rest.type';
import { ExAccountCode, ExTrade } from '@/exchange/exchanges-types';

export class BitfinexRest extends ExRest {
  constructor(params: Partial<ExRestParams>) {
    super({
      host: 'api-pub.bitfinex.com',
      ...params,
      exAccount: ExAccountCode.bitfinexUnified,
    });
  }

  protected async buildReq(p: ExRestReqBuildParams): Promise<ExRestReqConfig> {
    const { method, params, headers } = p;

    const paramsStr = this.urlParamsStr({
      ...params,
    });

    const url = this.url(p) + '?' + paramsStr;
    const reqHeaders = {
      'Content-Type': 'application/json; charset=UTF-8',
    };

    for (const key in headers) {
      reqHeaders[key] = headers[key];
    }

    return {
      method: method,
      url: url,
      headers: reqHeaders,
    };
  }

  async getCandlesticks(params: FetchCandleParam): Promise<Candle[]> {
    return Promise.resolve([]);
  }

  async getHistoryTrades(params: FetchHistoryTradeParam): Promise<ExTrade[]> {
    return Promise.resolve([]);
  }

  async getTrades(params: FetchTradeParam): Promise<ExTrade[]> {
    return Promise.resolve([]);
  }
}
