import * as Rx from 'rxjs';
import {
  ExWs,
  ExWsParams,
  WsChannelOp,
  WsSubscription,
} from '@/exchange/base/ws/ex-ws';
import { SymbolParamSubject } from '@/exchange/base/ws/ex-ws-subjects';
import { mergeId, WsStatus } from '@/exchange/base/ws/base-ws';
import {
  ExAccountCode,
  ExchangeCode,
  ExTrade,
} from '@/exchange/exchanges-types';
import { TradeTicker } from '@/exchange/okx/types';
import { TradeChannelEvent, WsCapacities } from '@/exchange/ws-capacities';

/**
 * https://www.okx.com/docs-v5/zh/#websocket-api
 */
export class OkxWs extends ExWs implements WsCapacities {
  static CHANNEL_TRADE = 'trades';

  constructor(params: Partial<ExWsParams>) {
    super(mergeId({ entityCode: ExAccountCode.okxUnified }, params));
    this.symbolsAwareChannels = [OkxWs.CHANNEL_TRADE];
    this.tickerSubjectForReconnectCheck = OkxWs.CHANNEL_TRADE;
  }

  protected heartbeat(): void {
    super.send('ping');
  }

  protected async address(): Promise<string> {
    return this.wsBaseUrl || `wss://wsaws.okx.com:8443/ws/v5/public`;
  }

  protected operateWsChannel(
    op: WsChannelOp,
    subscriptions: WsSubscription[],
  ): void {
    const req = {
      op: op.toLowerCase(),
      args: subscriptions.map((s) => ({
        channel: s.channel,
        instId: s.symbol,
      })),
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
    const event = obj.event;
    if (event) {
      if (event === 'subscribe' || event === 'unsubscribe') {
        return;
      }
      if (event === 'error') {
        this.logError(obj, 'onMessageObj');
        return;
      }
      this.logger.warn(`unknown event: ${event}`);
    }

    const channel = obj.arg?.channel;
    if (channel === OkxWs.CHANNEL_TRADE) {
      const trades = obj.data as TradeTicker[];
      if (trades.length === 0) {
        return;
      }
      for (const t of trades) {
        const exTrade: ExTrade = {
          ex: ExchangeCode.okx,
          exAccount: ExAccountCode.okxUnified,
          rawSymbol: t.instId,
          tradeId: t.tradeId,
          price: +t.px,
          size: +t.sz,
          side: t.side,
          ts: +t.ts,
        };
        this.publishMessage(OkxWs.CHANNEL_TRADE, exTrade);
        this.checkTradeConnectionResume(exTrade);
      }
    }
  }

  tradeSubject(): SymbolParamSubject<ExTrade> {
    return this.symbolParamSubject(OkxWs.CHANNEL_TRADE);
  }

  tradeConnectionEvent(): Rx.Observable<TradeChannelEvent> {
    return this.getTradeConnectionEvent<ExTrade>();
  }
}
