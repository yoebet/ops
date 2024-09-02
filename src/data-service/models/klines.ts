import { Footprint0, Footprint1, Kline0 } from './base';

export interface OFlowKline extends Kline0, Footprint0 {}

export interface OFlowFpKline extends OFlowKline {
  prl: number;
  // footprints
  fps: Footprint1[];
}
