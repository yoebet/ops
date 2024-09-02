import { ExSymbol, TradeAgg } from '@/db/models-data/base';
import { Kline } from '@/db/models-data/kline';

export interface Footprint extends ExSymbol, TradeAgg {
  time: Date;
  interval: string;
  pt: number;
  prl: number;
  pl: number;
  pu: number;
}

export interface FpKline extends Kline {
  prl: number;
  // footprints
  fps: Footprint[];
}
