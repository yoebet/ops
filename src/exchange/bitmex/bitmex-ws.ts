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
import { TradeTickerBitMEX } from '@/exchange/bitmex/types';

import { TradeSide } from '@/db/models-data/base';
import * as Rx from 'rxjs';

export class BitMexWs extends ExWs implements WsCapacities {
  static CHANNEL_TRADE = 'trade';

  constructor(params: Partial<ExWsParams>) {
    super(mergeId({ entityCode: ExAccountCode.bitmexUnified }, params));
    this.symbolsAwareChannels = [BitMexWs.CHANNEL_TRADE];
    this.tickerSubjectForReconnectCheck = BitMexWs.CHANNEL_TRADE;
  }

  protected heartbeat() {
    super.send('ping');
  }

  protected async address(): Promise<string> {
    return this.wsBaseUrl || `wss://ws.bitmex.com/realtime`;
  }

  // 如果一次订阅所有频道（所有杠杆、永续、交割 symbols），发送消息过大，
  // 会导致出错关闭（Max frame length of 65536 has been exceeded.）
  // 故分批订阅
  // chunkSize 500: 发送消息长度 22000 - 25000
  protected async subscribeWsChannel(ss: WsSubscription[]): Promise<void> {
    await super.subscribeWsChannelChunked(ss, 500, 1000);
  }

  protected async operateWsChannel(
    op: WsChannelOp,
    subscriptions: WsSubscription[],
  ): Promise<void> {
    const opString = op === 'SUBSCRIBE' ? 'subscribe' : 'unsubscribe';
    const req = {
      op: opString,
      args: subscriptions.map((value) => {
        return BitMexWs.CHANNEL_TRADE + ':' + value.symbol;
      }),
    };
    this.sendJson(req);
  }

  tradeSubject(): SymbolParamSubject<ExTrade> {
    return this.symbolParamSubject(BitMexWs.CHANNEL_TRADE);
  }

  protected async onMessageObj(rawData: any): Promise<void> {
    // console.debug('rawData:' + JSON.stringify(rawData));
    if (
      !rawData ||
      rawData.action != 'insert' ||
      rawData.table != 'trade' ||
      !rawData.data ||
      rawData.data.length < 1
    ) {
      return;
    }
    const trades = rawData.data as TradeTickerBitMEX[];
    for (const t of trades) {
      const exTrade: ExTrade = {
        ex: ExchangeCode.bitmex,
        exAccount: ExAccountCode.bitmexUnified,
        rawSymbol: t.symbol,
        tradeId: t.trdMatchID,
        price: t.price,
        size: t.size,
        side: t.side == 'Sell' ? TradeSide.sell : TradeSide.buy,
        ts: new Date(t.timestamp).getTime(),
      };
      this.publishMessage(BitMexWs.CHANNEL_TRADE, exTrade);
      this.checkTradeConnectionResume(exTrade);
    }
  }

  tradeConnectionEvent(): Rx.Observable<TradeChannelEvent> {
    return this.getTradeConnectionEvent<ExTrade>();
  }
}
