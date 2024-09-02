import { TradeSide } from '@/db/models-data/base';

export interface BlockTicker {
  trade_time: string;
  symbol: string;
  ex_code: string;
  trade_id: string;
  trade_price: string;
  trade_size: string;
  trade_amount: string;
  trade_side: TradeSide;
  // data_id: string;
}
