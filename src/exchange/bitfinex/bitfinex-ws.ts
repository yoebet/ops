import {
  ExWs,
  ExWsParams,
  WsChannelOp,
  WsSubscription,
} from '@/exchange/base/ws/ex-ws';
import { TradeChannelEvent, WsCapacities } from '@/exchange/ws-capacities';
import { mergeId } from '@/exchange/base/ws/base-ws';
import {
  ExAccountCode,
  ExchangeCode,
  ExTrade,
} from '@/exchange/exchanges-types';
import { SymbolParamSubject } from '@/exchange/base/ws/ex-ws-subjects';
import { wait } from '@/common/utils/utils';

import { TradeSide } from '@/db/models-data/base';
import * as Rx from 'rxjs';

export class BitfinexWs extends ExWs implements WsCapacities {
  static CHANNEL_TRADE = 'trades';
  protected channelIdSymbolMap: Map<string, string> = new Map<string, string>();

  constructor(params: Partial<ExWsParams>) {
    super(mergeId({ entityCode: ExAccountCode.bitfinexUnified }, params));
    this.symbolsAwareChannels = [BitfinexWs.CHANNEL_TRADE];
    this.tickerSubjectForReconnectCheck = BitfinexWs.CHANNEL_TRADE;
  }

  protected async address(): Promise<string | URL> {
    return this.wsBaseUrl || `wss://api-pub.bitfinex.com/ws/2`;
  }

  protected heartbeat(): void {
    const p = {
      event: 'ping',
      cid: 1234,
    };
    super.send(JSON.stringify(p));
  }

  protected async operateWsChannel(
    op: WsChannelOp,
    subscriptions: WsSubscription[],
  ): Promise<void> {
    const opString = op === 'SUBSCRIBE' ? 'subscribe' : 'unsubscribe';
    for (const rawSymbol of subscriptions) {
      const req = {
        event: opString,
        channel: BitfinexWs.CHANNEL_TRADE,
        symbol: rawSymbol.symbol,
      };
      this.sendJson(req);
      await wait(50);
    }
  }

  tradeSubject(): SymbolParamSubject<ExTrade> {
    return this.symbolParamSubject(BitfinexWs.CHANNEL_TRADE);
  }

  protected async onMessageObj(rawData: any): Promise<void> {
    if (rawData.hasOwnProperty('event') && rawData['event'] === 'subscribed') {
      this.channelIdSymbolMap.set(rawData['chanId'], rawData['symbol']);
    } else {
      if (
        Array.isArray(rawData) &&
        rawData.length > 2 &&
        rawData[1] === 'te' &&
        Array.isArray(rawData[2])
      ) {
        const rawSymbol = this.channelIdSymbolMap.get(rawData[0]);
        if (!rawData) {
          return;
        }
        const tradeArray = rawData[2];
        const exTrade: ExTrade = {
          ex: ExchangeCode.bitfinex,
          exAccount: ExAccountCode.bitfinexUnified,
          rawSymbol: rawSymbol,
          tradeId: String(tradeArray[0]),
          price: +tradeArray[3],
          size: Math.abs(+tradeArray[2]),
          side: +tradeArray[2] > 0 ? TradeSide.buy : TradeSide.sell,
          ts: +tradeArray[1],
        };
        this.publishMessage(BitfinexWs.CHANNEL_TRADE, exTrade);
        this.checkTradeConnectionResume(exTrade);
      }
    }
  }

  tradeConnectionEvent(): Rx.Observable<TradeChannelEvent> {
    return this.getTradeConnectionEvent<ExTrade>();
  }
}
