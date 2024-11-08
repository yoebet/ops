import { ExRest } from '@/exchange/base/rest/ex-rest';
import {
  ExRestReqBuildParams,
  ExRestReqConfig,
} from '@/exchange/base/rest/rest.type';
import { ExKline, FetchKlineParams } from '@/exchange/rest-types';
import { CandleRawDataBinance } from '@/exchange/binance/types';

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
}
