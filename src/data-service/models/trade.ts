import { TradeSide, ES } from '@/db/models-data/base';
import { ExMarket } from '@/exchange/exchanges-types';

export interface Trade extends ES {
  time: Date;
  tradeId: string;
  price: number;
  size: number;
  amount: number;
  side: TradeSide;
  dataId?: number;
  csize?: number; // 原始size，可能为合约张数
  block?: number; // 1: 大单

  market: ExMarket | string;
  base: string;
  quote: string;
}
