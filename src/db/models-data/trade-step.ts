import { ExSymbol } from '@/db/models-data/base';

export interface TradeStep extends ExSymbol {
  time: Date;
  trade_id: string;
  group_type: string;
  part_id: number;
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
