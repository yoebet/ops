import { PlaceOrderParams } from '@/exchange/exchange-service-types';
import { MINUTE_MS } from '@/common/utils/utils';

export interface StrategyJobData {
  strategyId: number;
}

export enum StrategyAlgo {
  MV = 'MV',
}

export interface MVStartupParams {
  waitForPercent?: number;
  activePercent?: number;
  drawbackPercent: number;
}

export interface TraceOrderJobData {
  strategyId: number;
  params: PlaceOrderParams;
}

export const IntenseWatchThreshold = 0.3; // 0.3%
export const IntenseWatchExitThreshold = 0.1; // 0.1%

export declare type WatchLevel =
  | 'hibernate' // 2h
  | 'sleep' // 30m
  | 'snap' // 5m
  | 'loose' // 1m
  | 'medium' // 5s
  | 'intense'; // ws

export const StrategyWorkerMaxStalledCount = 10;
export const StrategyWorkerStalledInterval = 3 * MINUTE_MS;
