import { TradeSide, ES } from '@/data-service/models/base';
import { ExMarket } from '@/db/models/exchange-types';

export interface Trade extends ES {
  time: Date;
  tradeId: string;
  price: number;
  size: number;
  amount: number;
  side: TradeSide;
  csize?: number; // 原始size，可能为合约张数

  market: ExMarket | string;
  base: string;
  quote: string;
}
