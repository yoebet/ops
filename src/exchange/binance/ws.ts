import {
  ExWs,
  ExWsParams,
  WsChannelOp,
  WsSubscription,
} from '@/exchange/base/ws/ex-ws';
import { SymbolParamSubject } from '@/exchange/base/ws/ex-ws-subjects';
import { mergeId } from '@/exchange/base/ws/base-ws';
import { ExchangeCode, ExMarket } from '@/db/models/exchange-types';
import { TradeSide } from '@/data-service/models/base';
import * as Rx from 'rxjs';
import { BinanceBaseRest } from '@/exchange/binance/rest';
import {
  ExWsKline,
  ExTrade,
  ExchangeMarketDataWs,
  TradeChannelEvent,
} from '@/exchange/exchange-service.types';
import { TradeTicker, WsCandle } from '@/exchange/binance/types';

export abstract class BinanceWs extends ExWs implements ExchangeMarketDataWs {
  // https://binance-docs.github.io/apidocs/spot/cn/#2b149598d9
  static CHANNEL_TRADE = 'trade';
  // https://binance-docs.github.io/apidocs/spot/cn/#utc-k-streams
  // kline_<interval>

  protected market: ExMarket;

  protected constructor(params: Partial<ExWsParams>) {
    super(mergeId({}, params));
    this.symbolsAwareChannels = [BinanceWs.CHANNEL_TRADE];
    this.tickerSubjectForReconnectCheck = BinanceWs.CHANNEL_TRADE;
  }

  protected heartbeat() {
    super.pong();
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

  protected async subscribeWsChannel(ss: WsSubscription[]): Promise<void> {
    await super.subscribeWsChannelChunked(ss, 500, 1000);
  }

  protected async onMessageObj(obj: any): Promise<void> {
    const channel = obj.e;
    if (!channel) {
      return;
    }
    if (channel === BinanceWs.CHANNEL_TRADE) {
      const trade = obj as TradeTicker;
      const exTrade: ExTrade = {
        ex: ExchangeCode.binance,
        market: this.market,
        rawSymbol: trade.s,
        tradeId: trade.t,
        price: +trade.p,
        size: +trade.q,
        side: trade.m ? TradeSide.sell : TradeSide.buy,
        ts: +trade.T,
      };
      this.publishMessage(BinanceWs.CHANNEL_TRADE, exTrade);
      this.checkTradeConnectionResume(exTrade);
    } else if (channel === 'kline') {
      const symbol = obj.s;
      const candle = obj.k as WsCandle;
      const klClosed = candle.x;
      if (!this.candleIncludeLive && !klClosed) {
        return;
      }
      const kline: ExWsKline = {
        ex: ExchangeCode.binance,
        market: this.market,
        rawSymbol: symbol,
        ts: Number(candle.t),
        open: Number(candle.o),
        high: Number(candle.h),
        low: Number(candle.l),
        close: Number(candle.c),
        size: Number(candle.v),
        amount: Number(candle.q),
        bs: Number(candle.V),
        ba: Number(candle.Q),
        ss: Number(candle.v) - Number(candle.V),
        sa: Number(candle.q) - Number(candle.Q),
        tds: Number(candle.n),
        live: !klClosed,
      };
      this.publishMessage(`kline_${candle.i}`, kline);
    }
  }

  tradeSubject(): SymbolParamSubject<ExTrade> {
    return this.symbolParamSubject(BinanceWs.CHANNEL_TRADE);
  }

  klineSubject(interval: string): SymbolParamSubject<ExWsKline> {
    const channelName = `kline_${BinanceBaseRest.toCandleInv(interval)}`;
    return this.symbolParamSubject(channelName);
  }

  tradeConnectionEvent(): Rx.Observable<TradeChannelEvent> {
    return this.getTradeConnectionEvent<ExTrade>();
  }
}
