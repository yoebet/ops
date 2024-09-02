/**
 * https://docs.kucoin.com/futures/#execution-data
 */
import { ExWs, ExWsParams } from '@/exchange/base/ws/ex-ws';
import { TradeChannelEvent, WsCapacities } from '@/exchange/ws-capacities';
import { getTsNow } from '@/common/utils/utils';
import { SymbolParamSubject } from '@/exchange/base/ws/ex-ws-subjects';
import {
  ExAccountCode,
  ExchangeCode,
  ExTrade,
} from '@/exchange/exchanges-types';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { HttpMethodType } from '@/exchange/base/rest/rest.type';
import {
  ExRestError,
  ExRestErrorType,
} from '@/exchange/base/errors/ex-rest.error';

import { TradeSide } from '@/db/models-data/base';
import * as Rx from 'rxjs';

export abstract class KuCoinWs extends ExWs implements WsCapacities {
  static CHANNEL_TRADE = 'match';

  protected exAccountCode: ExAccountCode;

  protected constructor(params: ExWsParams) {
    super(params);
    this.symbolsAwareChannels = [KuCoinWs.CHANNEL_TRADE];
    this.tickerSubjectForReconnectCheck = KuCoinWs.CHANNEL_TRADE;
  }

  protected heartbeat(): void {
    const ping = {
      id: getTsNow().toString(),
      type: 'ping',
    };
    super.send(JSON.stringify(ping));
  }

  tradeSubject(): SymbolParamSubject<ExTrade> {
    return this.symbolParamSubject(KuCoinWs.CHANNEL_TRADE);
  }

  protected async getWSEndpoint(url: string): Promise<string> {
    let res: AxiosResponse;
    const defaultConfig: AxiosRequestConfig = {
      // timeout: 5000,
      // 默认不根据 http status 来抛错误
      validateStatus: () => true,
    };
    if (this.agent) {
      defaultConfig.proxy = false;
      defaultConfig.httpsAgent = this.agent;
      defaultConfig.httpAgent = this.agent;
    }
    const config = {
      method: HttpMethodType.post,
      url: url,
    };

    try {
      // 发起请求
      const axiosRequestConfig: AxiosRequestConfig = {
        ...defaultConfig,
        // 子类的配置可以覆盖默认配置
        ...config,
      };

      res = await axios.request(axiosRequestConfig);
      if (res.status != 200) {
        throw new ExRestError(`Request failed`, {
          errType: ExRestErrorType.networkErr,
          url: config.url,
          errMsg: res.status,
          response: res,
        });
      }
      if (res.data.code != '200000') {
        throw new ExRestError(`res.data.code!='200000'`, {
          errType: ExRestErrorType.networkErr,
          url: config.url,
          errMsg: res.data.code,
          response: res,
        });
      }
      const endpointArray = res.data.data.instanceServers;
      const token = res.data.data.token;
      if (!endpointArray || endpointArray.length < 1) {
        throw new ExRestError(`endpointArray error`, {
          errType: ExRestErrorType.networkErr,
          url: config.url,
          errMsg: res.data.code,
          response: res,
        });
      }
      return endpointArray[0].endpoint + '?token=' + token;
    } catch (e) {
      this.logger?.error(e);
      // 包装一下错误
      throw new ExRestError(`Request failed`, {
        errType: ExRestErrorType.networkErr,
        url: config.url,
        errMsg: e,
        response: res,
      });
    }
  }

  protected async onMessageObj(obj: any): Promise<void> {
    // console.log(JSON.stringify(obj));
    const trade = obj.data;
    const exTrade: ExTrade = {
      ex: ExchangeCode.kucoin,
      exAccount: this.exAccountCode,
      rawSymbol: trade.symbol,
      tradeId: trade.tradeId,
      price: +trade.price,
      size: +trade.size,
      side: trade.side == 'buy' ? TradeSide.buy : TradeSide.sell,
      ts: trade.ts
        ? Math.floor(+trade.ts / 1000000)
        : Math.floor(+trade.time / 1000000),
    };
    this.publishMessage(KuCoinWs.CHANNEL_TRADE, exTrade);
    this.checkTradeConnectionResume(exTrade);
  }

  tradeConnectionEvent(): Rx.Observable<TradeChannelEvent> {
    return this.getTradeConnectionEvent<ExTrade>();
  }
}
