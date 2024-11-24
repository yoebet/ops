import { PlaceOrderParams } from '@/exchange/exchange-service-types';
import { TradeSide } from '@/data-service/models/base';

export enum StrategyAlgo {
  MVB = 'MVB',
  MVS = 'MVS',
  MVBS = 'MVBS',
  BR = 'BR',
}

// runners

export class ExitSignal extends Error {}

export interface TradeOpportunity {
  orderTag?: string;
  side?: TradeSide;
  placeOrderPrice?: number;
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
}

export interface BRCheckerParams {
  interval: string;
  periods: number;
  checkPeriods: number;
  contrastPeriods: number;
  baselineAmountTimes: number;
  baselinePriceChangeTimes: number;
  selfAmountTimes: number;
  selfPriceChangeTimes: number;
}

export interface MVRuntimeParams {
  startingPrice?: number;
  placeOrderPrice?: number;
}

// strategies:

export interface MVStrategyParams {
  open: MVCheckerParams;
  close?: MVCheckerParams;
}

export interface BRStrategyParams {
  open: BRCheckerParams;
  close: MVCheckerParams;
}
