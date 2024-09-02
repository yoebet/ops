import { TradeSide } from '@/db/models-data/base';

export interface Trade0 {
  time: Date;
  symbol: string;
  ex: string;
  trade_id: string;
  side: TradeSide;
  data_id: number;
  price: number;
  size: number;
  amount: number;
}

export interface TradeBlock extends Trade0 {}
