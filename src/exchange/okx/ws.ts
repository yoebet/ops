import * as Rx from 'rxjs';
import {
  ExWs,
  ExWsParams,
  WsChannelOp,
  WsSubscription,
} from '@/exchange/base/ws/ex-ws';
import { SymbolParamSubject } from '@/exchange/base/ws/ex-ws-subjects';
import { mergeId } from '@/exchange/base/ws/base-ws';
import { ExchangeCode, ExMarket } from '@/db/models/exchange-types';
import {
  ExchangeMarketDataWs,
  TradeChannelEvent,
} from '@/exchange/exchange-ws-types';
import { ExWsComposite } from '@/exchange/base/ws/ex-ws-composite';
import { ExWsKline, ExTrade } from '@/exchange/exchange-service-types';
import { CandleRawDataOkx, TradeTicker } from '@/exchange/okx/types';
import { OkxMarketData } from '@/exchange/okx/okx-market-data';

abstract class OkxBaseWs extends ExWs {
  protected constructor(params: Partial<ExWsParams>) {
    super(mergeId({}, params));
  }

  protected heartbeat(): void {
    super.send('ping');
  }

  protected async subscribeWsChannel(ss: WsSubscription[]): Promise<void> {
    await super.subscribeWsChannelChunked(ss, 500, 1000);
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

  protected checkMessage(obj) {
    const event = obj.event;
    if (event) {
      if (event === 'subscribe' || event === 'unsubscribe') {
        return false;
      }
      if (event === 'error') {
        this.logError(obj, 'onMessageObj');
        return false;
      }
      this.logger.warn(`unknown event: ${event}`);
    }
    return true;
  }

  evalExMarket(rawSymbol: string) {
    if (rawSymbol.endsWith('-USD-SWAP')) {
      return ExMarket.perp_inv;
    } else if (rawSymbol.endsWith('-SWAP')) {
      return ExMarket.perp;
    }
    return ExMarket.spot;
  }
}

class OkxTradeWs extends OkxBaseWs {
  // https://www.okx.com/docs-v5/zh/#order-book-trading-market-data-ws-trades-channel
  static CHANNEL_TRADE = 'trades';

  constructor(params: Partial<ExWsParams>) {
    super(mergeId({ category: 'trade' }, params));
  }

  tradeSubject(): SymbolParamSubject<ExTrade> {
    return this.symbolParamSubject(OkxTradeWs.CHANNEL_TRADE);
  }

  protected async address(): Promise<string> {
    return this.wsBaseUrl || `wss://wsaws.okx.com:8443/ws/v5/public`;
  }

  protected async onMessageObj(obj: any): Promise<void> {
    if (!this.checkMessage(obj)) {
      return;
    }

    const channel = obj.arg?.channel;
    if (channel === OkxTradeWs.CHANNEL_TRADE) {
      const trades = obj.data as TradeTicker[];
      if (trades.length === 0) {
        return;
      }
      for (const t of trades) {
        const rawSymbol = t.instId;
        const exTrade: ExTrade = {
          ex: ExchangeCode.okx,
          market: this.evalExMarket(rawSymbol),
          rawSymbol,
          tradeId: t.tradeId,
          price: +t.px,
          size: +t.sz,
          side: t.side,
          ts: +t.ts,
        };
        this.publishMessage(channel, exTrade);
        this.checkTradeConnectionResume(exTrade);
      }
    }
  }
}

class OkxKlineWs extends OkxBaseWs {
  // https://www.okx.com/docs-v5/zh/#order-book-trading-market-data-ws-candlesticks-channel
  // candle30m,candle15m,candle5m,candle3m,candle1m,candle1s

  constructor(params: Partial<ExWsParams>) {
    super(mergeId({ category: 'kline' }, params));
  }

  klineSubject(interval: string): SymbolParamSubject<ExWsKline> {
    const channelName = `candle${OkxMarketData.toCandleInv(interval)}`;
    return this.symbolParamSubject(channelName);
  }

  protected async address(): Promise<string> {
    return this.wsBaseUrl || `wss://wsaws.okx.com:8443/ws/v5/business`;
  }

  protected async onMessageObj(obj: any): Promise<void> {
    if (!this.checkMessage(obj)) {
      return;
    }

    const channel = obj.arg?.channel;
    if (channel.startsWith('candle')) {
      const symbol = obj.arg.instId;
      const candles = obj.data as CandleRawDataOkx[];
      candles.forEach((c) => {
        const live = c[8] === '0';
        if (!this.candleIncludeLive && live) {
          return;
        }
        const k = OkxMarketData.toKline(c);
        const kl = k as ExWsKline;
        kl.ex = ExchangeCode.okx;
        kl.market = this.evalExMarket(symbol);
        kl.rawSymbol = symbol;
        kl.live = live;
        this.publishMessage(channel, kl);
      });
    }
  }
}

/**
 * https://www.okx.com/docs-v5/zh/#websocket-api
 */
export class OkxWs extends ExWsComposite implements ExchangeMarketDataWs {
  tradeWs: OkxTradeWs;
  klineWs: OkxKlineWs;

  constructor(params: Partial<ExWsParams>) {
    super(mergeId({}, params));

    this.tradeWs = new OkxTradeWs(params);
    this.klineWs = new OkxKlineWs(params);
    this.wss = [this.tradeWs, this.klineWs];
  }

  tradeSubject(): SymbolParamSubject<ExTrade> {
    return this.tradeWs.tradeSubject();
  }

  klineSubject(interval: string): SymbolParamSubject<ExWsKline> {
    return this.klineWs.klineSubject(interval);
  }

  tradeConnectionEvent(): Rx.Observable<TradeChannelEvent> {
    return this.getTradeConnectionEvent<ExTrade>();
  }
}
