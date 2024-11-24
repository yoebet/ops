import { PlaceOrderParams } from '@/exchange/exchange-service-types';
import { TradeSide } from '@/data-service/models/base';

export enum StrategyAlgo {
  MV = 'MV',
  BR = 'BR',
}

// runners

export class ExitSignal extends Error {}

export interface CheckOpportunityReturn {
  placeOrder?: boolean;
  orderTag?: string;
}

export declare type WatchLevel =
  | 'hibernate' // 2h
  | 'sleep' // 30m
  | 'snap' // 5m
  | 'loose' // 1m
  | 'medium' // 20s
  | 'high' // 5s
  | 'intense'; // ws

// jobs:

export interface StrategyJobData {
  strategyId: number;
  dealId?: number;
  runOneDeal?: boolean;
}

export interface TraceOrderJobData {
  strategyId: number;
  params: PlaceOrderParams;
}

// checkers

export interface MVCheckerParams {
  waitForPercent?: number;
  activePercent?: number;
  drawbackPercent: number;
  newDealTradeSide?: TradeSide;
}

export interface BRCheckerParams {
  interval: string; // 1m
  periods: number; // 30
  checkPeriods: number; // 2
  contrastPeriods: number; //28
  baselineAmountFlucTimes: number; // 2
  baselinePriceFlucTimes: number; // 1.5
  selfAmountFlucTimes: number; // 5
  selfPriceFlucTimes: number; // 3
}

export interface MVRuntimeParams {
  startingPrice?: number;
  placeOrderPrice?: number;
  activePrice?: number;
}

// strategies:

export interface MVStrategyParams extends MVCheckerParams {
  newDealTradeSide?: TradeSide;
}

export interface BRStrategyParams {
  open: BRCheckerParams;
  close: MVCheckerParams;
}
