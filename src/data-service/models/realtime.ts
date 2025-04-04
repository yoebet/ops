import { ES, TradeSide } from '@/data-service/models/base';
import { FtKline } from '@/data-service/models/kline';

export interface RtPrice extends ES {
  ts: number;
  base: string;
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

export interface RtKline extends FtKline, ES {
  interval: string;
  live?: boolean;
}
