import { PlaceOrderParams } from '@/exchange/exchange-service-types';
import { MINUTE_MS } from '@/common/utils/utils';
import { TradeSide } from '@/data-service/models/base';

export enum StrategyAlgo {
  MV = 'MV',
  BR = 'BR',
}

export interface StrategyJobData {
  strategyId: number;
}

export interface MVStartupParams {
  waitForPercent?: number;
  activePercent?: number;
  drawbackPercent: number;
  newDealTradeSide?: TradeSide;
}

export interface TraceOrderJobData {
  strategyId: number;
  params: PlaceOrderParams;
}

export declare type WatchLevel =
  | 'hibernate' // 2h
  | 'sleep' // 30m
  | 'snap' // 5m
  | 'loose' // 1m
  | 'medium' // 5s
  | 'intense'; // ws

export const IntenseWatchThreshold = 0.3; // 0.3%
export const IntenseWatchExitThreshold = 0.1; // 0.1%

export const StrategyWorkerMaxStalledCount = 10;
export const StrategyWorkerStalledInterval = 3 * MINUTE_MS;
export const ReportStatusInterval = MINUTE_MS;
