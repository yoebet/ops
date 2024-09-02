import {
  ExWs,
  ExWsParams,
  WsChannelOp,
  WsSubscription,
} from '@/exchange/base/ws/ex-ws';
import { TradeChannelEvent, WsCapacities } from '@/exchange/ws-capacities';
import { SymbolParamSubject } from '@/exchange/base/ws/ex-ws-subjects';
import { mergeId } from '@/exchange/base/ws/base-ws';
import {
  ExAccountCode,
  ExchangeCode,
  ExTrade,
} from '@/exchange/exchanges-types';
import { getTsNow } from '@/common/utils/utils';
import {
  CoinbaseTradeEvent,
  SubscribeTradeRequest,
} from '@/exchange/coinbase/types';

import { TradeSide } from '@/db/models-data/base';
import * as Rx from 'rxjs';

const CryptoJS = require('crypto-js');

export class CoinbaseWsAdvanced extends ExWs implements WsCapacities {
  private static CHANNEL_TRADE = 'market_trades';

  private readonly APIKey = 'dpmzIA7lcJXLJFPi';
  private readonly APISecret = 'R3IBHxUtuNihC6b7aAhQcii0AR88EXWr';

  constructor(params: Partial<ExWsParams>) {
    super(mergeId({ entityCode: ExAccountCode.coinbaseUnified }, params));
    this.symbolsAwareChannels = [CoinbaseWsAdvanced.CHANNEL_TRADE];
    this.tickerSubjectForReconnectCheck = CoinbaseWsAdvanced.CHANNEL_TRADE;
  }

  protected async address(): Promise<string | URL> {
    return this.wsBaseUrl || 'wss://advanced-trade-ws.coinbase.com';
  }

  private signRequestSubscribeTrade(symbols: string[]): SubscribeTradeRequest {
    // const ts = Math.floor(getTsNow() / 1000);
    // const signString =
    //   ts.toString() + CoinbaseWsAdvanced.CHANNEL_TRADE + symbols.join(',');
    // const sign = CryptoJS.HmacSHA256(signString, this.APISecret).toString();
    const req: any = {
      type: 'subscribe',
      product_ids: symbols,
      channel: CoinbaseWsAdvanced.CHANNEL_TRADE,
      // api_key: this.APIKey,
      // timestamp: '' + ts,
      // signature: sign,
      // jwt: 'XYZ',
    };
    return req;
  }

  protected operateWsChannel(
    op: WsChannelOp,
    subscriptions: WsSubscription[],
  ): void {
    const symbols: string[] = subscriptions.map((s) => {
      return s.symbol;
    });
    const req = this.signRequestSubscribeTrade(symbols);
    this.sendJson(req);
  }

  tradeSubject(): SymbolParamSubject<ExTrade> {
    return this.symbolParamSubject(CoinbaseWsAdvanced.CHANNEL_TRADE);
  }

  protected async onMessageObj(obj: any): Promise<void> {
    if (
      !obj ||
      obj.channel != 'market_trades' ||
      !obj.events ||
      obj.events.length <= 0
    ) {
      return;
    }

    const events = obj.events as CoinbaseTradeEvent[];
    for (const event of events) {
      if (event.type != 'update' || !event.trades || event.trades.length <= 0) {
        continue;
      }
      const trades = event.trades.sort((a, b) => +a.trade_id - +b.trade_id);
      for (const trade of trades) {
        const exTrade: ExTrade = {
          ex: ExchangeCode.coinbase,
          exAccount: ExAccountCode.coinbaseUnified,
          rawSymbol: trade.product_id,
          tradeId: trade.trade_id,
          price: +trade.price,
          size: +trade.size,
          side: trade.side == 'BUY' ? TradeSide.sell : TradeSide.buy, //方向是maker的 所以 是BUY的时候 是主动卖
          ts: new Date(trade.time).getTime(),
        };
        this.publishMessage(CoinbaseWsAdvanced.CHANNEL_TRADE, exTrade);
        this.checkTradeConnectionResume(exTrade);
      }
    }
  }

  tradeConnectionEvent(): Rx.Observable<TradeChannelEvent> {
    return this.getTradeConnectionEvent<ExTrade>();
  }
}
