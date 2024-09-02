export const OFLOW_WS_PATH = '/oflow/ws';

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
  user = 'user',
}

export enum OflowDataType {
  kline = 'kline',
  footprint = 'footprint',
  ticker = 'ticker',
  block = 'block',
}

export enum OflowDataChannel {
  kline = 'kline',
  footprint = 'footprint',
  ticker = 'ticker',
}
