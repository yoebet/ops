import * as Rx from 'rxjs';
import { SymbolParamSubject } from '@/exchange/base/ws/ex-ws-subjects';
import { ChannelConnectionEvent, ExWs } from '@/exchange/base/ws/ex-ws';
import { ExTrade } from '@/exchange/exchanges-types';

export type TradeChannelEvent = ChannelConnectionEvent<ExTrade>;

export interface WsCapacities {
  tradeSubject(): SymbolParamSubject<ExTrade>;
  tradeConnectionEvent(): Rx.Observable<TradeChannelEvent>;
}

export type CapableWs = ExWs & WsCapacities;
