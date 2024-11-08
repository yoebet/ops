import * as Rx from 'rxjs';
import { SymbolParamSubject } from '@/exchange/base/ws/ex-ws-subjects';
import { ChannelConnectionEvent, ExWs } from '@/exchange/base/ws/ex-ws';
import { ExKlineWithSymbol, ExTrade } from '@/exchange/rest-types';

export type TradeChannelEvent = ChannelConnectionEvent<ExTrade>;

export interface ExchangeWs {
  tradeSubject(): SymbolParamSubject<ExTrade>;

  klineSubject(interval: string): SymbolParamSubject<ExKlineWithSymbol>;

  tradeConnectionEvent(): Rx.Observable<TradeChannelEvent>;
}

export type CapableWs = ExWs & ExchangeWs;
