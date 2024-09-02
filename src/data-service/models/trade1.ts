import { TradeSide, ES } from '@/db/models-data/base';
import { ExMarket } from '@/exchange/exchanges-types';

export interface Trade0 extends ES {
  time: Date;
  tradeId: string;
  price: number;
  size: number;
  amount: number;
  side: TradeSide;
  dataId?: number;
}

export interface Trade1 extends Trade0 {
  csize?: number; // 原始size，可能为合约张数
  block?: number; // 1: 大单

  market: ExMarket | string;
  base: string;
  quote: string;
}
