import { WsStatusType } from '@/exchange/base/ws/ex-ws-monitor-types';
import { ExAccountCode } from '@/exchange/exchanges-types';

export class ExObjFilter {
  path: string;

  value?: string;
}

export class ExWsInstanceSelector {
  leafOnly?: boolean;

  ids?: string; // idWithoutEx

  category?: string;

  instanceIndex?: number;

  forSymbol?: string;
}

export abstract class ExInstanceSelector {
  exchange: ExAccountCode;

  wsInstance?: ExWsInstanceSelector;
}

export class ExWatchedKeysCountInput {
  exchange: ExAccountCode;
}

export class ExWsShowInstancesInput {
  exchange: ExAccountCode;
}

export class ExWsShowStatusInput extends ExInstanceSelector {
  type?: WsStatusType;
}

export class ExWsShowSymbolsInput extends ExInstanceSelector {
  channel?: string;
}

export abstract class ExObserveInput extends ExInstanceSelector {
  maxTake?: number;

  maxSeconds?: number;
}

export class ExObserveStatusInput extends ExObserveInput {
  type?: WsStatusType;

  interval?: number;
}

export class ExObserveChannelInput extends ExObserveInput {
  channel: string;

  minInterval?: number;

  filter?: ExObjFilter;
}
