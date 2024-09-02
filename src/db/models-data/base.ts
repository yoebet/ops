import { ExchangeCode, ExMarket } from '@/exchange/exchanges-types';

export enum TradeSide {
  'buy' = 'buy',
  'sell' = 'sell',
}

export interface ExSymbol {
  ex: ExchangeCode | string;
  market: ExMarket | string;
  symbol: string;
  base: string;
  quote: string;
}

export interface ES {
  ex: string;
  symbol: string;
}

export interface TradeAgg {
  tds: number;
  size: number;
  amount: number;
  bc: number;
  bs: number;
  ba: number;
  sc: number;
  ss: number;
  sa: number;
}

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
}
