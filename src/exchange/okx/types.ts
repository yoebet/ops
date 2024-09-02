// ws & rest

import { TradeSide } from '@/db/models-data/base';

export interface TradeTicker {
  instId: string;
  tradeId: string;
  px: string;
  sz: string;
  side: TradeSide;
  ts: string; // ms
}
