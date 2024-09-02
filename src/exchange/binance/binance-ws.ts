import {
  ExWs,
  ExWsParams,
  WsChannelOp,
  WsSubscription,
} from '@/exchange/base/ws/ex-ws';
import { SymbolParamSubject } from '@/exchange/base/ws/ex-ws-subjects';
import { mergeId } from '@/exchange/base/ws/base-ws';
import {
  ExAccountCode,
  ExchangeCode,
  ExTrade,
} from '@/exchange/exchanges-types';
import { TradeTicker } from '@/exchange/binance/types';
import { TradeChannelEvent, WsCapacities } from '@/exchange/ws-capacities';

import { TradeSide } from '@/db/models-data/base';
import * as Rx from 'rxjs';

export abstract class BinanceWs extends ExWs implements WsCapacities {
  static CHANNEL_TRADE = 'trade';
  protected exAccountCode: ExAccountCode;

  protected heartbeat() {
    super.pong();
  }

  protected constructor(params: Partial<ExWsParams>) {
    super(mergeId({}, params));
    this.symbolsAwareChannels = [BinanceWs.CHANNEL_TRADE];
    this.tickerSubjectForReconnectCheck = BinanceWs.CHANNEL_TRADE;
  }

  tradeSubject(): SymbolParamSubject<ExTrade> {
    return this.symbolParamSubject(BinanceWs.CHANNEL_TRADE);
  }

  protected operateWsChannel(
    op: WsChannelOp,
    subscriptions: WsSubscription[],
  ): void {
    const opString = op === 'SUBSCRIBE' ? 'SUBSCRIBE' : 'UNSUBSCRIBE';
    const req = {
      method: opString,
      params: subscriptions.map(
        (s) => s.symbol.toLowerCase() + '@' + s.channel.toLowerCase(),
      ),
      id: this.accumulatedSentMessageCounter,
    };
    this.sendJson(req);
  }

  // 如果一次订阅所有频道（所有杠杆、永续、交割 symbols），发送消息过大，
  // 会导致出错关闭（Max frame length of 65536 has been exceeded.）
  // 故分批订阅
  // chunkSize 500: 发送消息长度 22000 - 25000
  protected async subscribeWsChannel(ss: WsSubscription[]): Promise<void> {
    await super.subscribeWsChannelChunked(ss, 500, 1000);
  }

  protected async onMessageObj(obj: any): Promise<void> {
    const trade = obj as TradeTicker;
    const channel = trade.e;
    if (channel === BinanceWs.CHANNEL_TRADE) {
      const exTrade: ExTrade = {
        ex: ExchangeCode.binance,
        exAccount: this.exAccountCode,
        rawSymbol: trade.s,
        tradeId: trade.t,
        price: +trade.p,
        size: +trade.q,
        side: trade.m ? TradeSide.sell : TradeSide.buy,
        ts: +trade.T,
      };
      this.publishMessage(BinanceWs.CHANNEL_TRADE, exTrade);
      this.checkTradeConnectionResume(exTrade);
    }
  }

  tradeConnectionEvent(): Rx.Observable<TradeChannelEvent> {
    return this.getTradeConnectionEvent<ExTrade>();
  }
}
