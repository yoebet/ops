import * as Rx from 'rxjs';
import { SymbolParamSubject } from '@/exchange/base/ws/ex-ws-subjects';
import { ChannelConnectionEvent } from '@/exchange/base/ws/ex-ws';
import { ExWsKline, ExTrade } from '@/exchange/exchange-service-types';

export type TradeChannelEvent = ChannelConnectionEvent<ExTrade>;

export interface ExchangeMarketDataWs {
  tradeSubject(): SymbolParamSubject<ExTrade>;

  klineSubject(interval: string): SymbolParamSubject<ExWsKline>;

  tradeConnectionEvent(): Rx.Observable<TradeChannelEvent>;
}
