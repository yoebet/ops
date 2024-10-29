export const DATA_WS_PATH = '/opsd/ws';

export const TICKER_THROTTLE = {
  MIN: 10,
  // MAX: 5000,
  DEFAULT: 10,
};

export enum OflowCommand {
  meta = 'meta',
  data = 'data',
  subs = 'subs',
  live = 'live',
}

export enum OflowDataType {
  kline = 'kline',
  ticker = 'ticker',
}

export enum OflowDataChannel {
  kline = 'kline',
  ticker = 'ticker',
}
