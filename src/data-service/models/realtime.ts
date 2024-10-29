import { ES, TradeSide } from '@/db/models-data/base';
import { OFlowKline } from '@/data-service/models/klines';

export interface RtPrice extends ES {
  ts: number;
  price: number;
}

export interface RtTicker extends ES {
  ts: number;
  size: number;
  amount: number;
  price: number;
  tradeId: string;
  side: TradeSide;
}

export interface RtKline extends OFlowKline, ES {
  interval: string;
}
