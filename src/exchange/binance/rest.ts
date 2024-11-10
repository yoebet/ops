import { ExRest } from '@/exchange/base/rest/ex-rest';
import {
  ExRestReqBuildParams,
  ExRestReqConfig,
} from '@/exchange/base/rest/rest.type';
import { HmacSHA256 } from 'crypto-js';

export abstract class BinanceBaseRest extends ExRest {
  protected async buildReq(p: ExRestReqBuildParams): Promise<ExRestReqConfig> {
    const { method, params, apiKey } = p;

    const ts = Date.now();
    const paramsStr = this.urlParamsStr({
      ...(apiKey
        ? {
            recvWindow: 5000,
            timestamp: ts,
          }
        : {}),
      ...params,
    });

    let url = this.url(p) + '?' + paramsStr;
    const headers = {
      'Content-Type': 'application/json; charset=UTF-8',
    };

    // 给私密接口签名
    if (apiKey) {
      headers['X-MBX-APIKEY'] = apiKey.key;
      const signature = HmacSHA256(paramsStr, apiKey.secret);
      url += '&signature=' + signature;
    }

    return {
      method,
      url,
      headers,
    };
  }

  static toCandleInv(inv: string): string {
    return inv === '1o' ? '1mo' : inv;
  }
}
