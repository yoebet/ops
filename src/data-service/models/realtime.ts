import {
  Footprint0,
  Footprint1,
  Kline0,
  OFlowTicker,
} from '@/data-service/models/base';
import { ES } from '@/db/models-data/base';

export interface RtPrice extends ES {
  ts: number;
  price: number;
}

export interface RtTicker extends OFlowTicker, ES {}

export interface RtKline extends Kline0, Footprint0, ES {
  interval: string;
}

export interface RtFpKline extends RtKline {
  prl: number;
  // footprints
  fps: Footprint1[];
}
