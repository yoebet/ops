import {
  ExWs,
  ExWsParams,
  WsChannelOp,
  WsSubscription,
} from '@/exchange/base/ws/ex-ws';
import { TradeChannelEvent, WsCapacities } from '@/exchange/ws-capacities';
import {
  ExAccountCode,
  ExchangeCode,
  ExTrade,
} from '@/exchange/exchanges-types';
import { mergeId } from '@/exchange/base/ws/base-ws';
import { SymbolParamSubject } from '@/exchange/base/ws/ex-ws-subjects';
import { getTsNow } from '@/common/utils/utils';
import { ByBitTradeTicker } from '@/exchange/bybit/types';

import { TradeSide } from '@/db/models-data/base';
import * as Rx from 'rxjs';

// https://bybit-exchange.github.io/docs/v5/websocket/public/trade
export abstract class ByBitWs extends ExWs implements WsCapacities {
  static CHANNEL_TRADE = 'publicTrade';
  protected exAccountCode: ExAccountCode;

  protected constructor(params: Partial<ExWsParams>) {
    super(mergeId({}, params));
    this.symbolsAwareChannels = [ByBitWs.CHANNEL_TRADE];
    this.tickerSubjectForReconnectCheck = ByBitWs.CHANNEL_TRADE;
  }

  protected heartbeat(): void {
    super.send(JSON.stringify({ op: 'ping' }));
  }

  tradeSubject(): SymbolParamSubject<ExTrade> {
    return this.symbolParamSubject(ByBitWs.CHANNEL_TRADE);
  }

  protected operateWsChannel(
    op: WsChannelOp,
    subscriptions: WsSubscription[],
  ): void {
    const opString = op === 'SUBSCRIBE' ? 'subscribe' : 'unsubscribe';
    const args = subscriptions.map((v) => {
      return 'publicTrade.' + v.symbol;
    });

    const request = {
      req_id: 'req_' + getTsNow().toString(),
      op: opString,
      args: args,
    };

    this.sendJson(request);
  }

  // 如果一次订阅所有频道（所有杠杆、永续、交割 symbols），发送消息过大，
  // 会导致出错关闭（Max frame length of 65536 has been exceeded.）
  // 故分批订阅
  // chunkSize 500: 发送消息长度 22000 - 25000
  protected async subscribeWsChannel(ss: WsSubscription[]): Promise<void> {
    await super.subscribeWsChannelChunked(ss, 500, 1000);
  }

  protected async onMessageObj(obj: any): Promise<void> {
    if (
      !obj ||
      obj['type'] != 'snapshot' ||
      !obj['data'] ||
      obj['data'].length <= 0
    ) {
      return;
    }

    const tradeArray = obj['data'] as ByBitTradeTicker[];
    tradeArray.sort((a, b) => {
      return +a.T - +b.T;
    });

    for (const trade of tradeArray) {
      const exTrade: ExTrade = {
        ex: ExchangeCode.bybit,
        exAccount: this.exAccountCode,
        rawSymbol: trade.s,
        tradeId: trade.i,
        price: +trade.p,
        size: +trade.v,
        side: trade.S == 'Buy' ? TradeSide.buy : TradeSide.sell,
        ts: +trade.T,
      };
      this.publishMessage(ByBitWs.CHANNEL_TRADE, exTrade);
      this.checkTradeConnectionResume(exTrade);
    }
  }

  tradeConnectionEvent(): Rx.Observable<TradeChannelEvent> {
    return this.getTradeConnectionEvent<ExTrade>();
  }
}
