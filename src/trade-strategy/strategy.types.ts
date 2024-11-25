import { PlaceOrderParams } from '@/exchange/exchange-service-types';
import { TradeSide } from '@/data-service/models/base';

export enum StrategyAlgo {
  MVB = 'MVB',
  MVS = 'MVS',
  MVBS = 'MVBS',
  BR = 'BR',
  FDB = 'FDB',
  FDS = 'FDS',
  LS = 'LS',
}

// runners

export class ExitSignal extends Error {}

export interface TradeOpportunity {
  orderTag?: string;
  side: TradeSide;
  orderPrice?: number;
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

export interface MVRuntimeParams extends MVCheckerParams {
  startingPrice?: number;
  orderPrice?: number;
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

export interface LSCheckerParams {
  interval: string;
  periods: number;
  checkPeriods: number;
  contrastPeriods: number;
  amountTimes: number;
  priceChangeTimes: number;
}

export interface PriceDiffParams {
  waitForPercent?: number;
  priceDiffPercent?: number;
}

export interface PriceDiffRuntimeParams extends PriceDiffParams {
  startingPrice?: number;
  basePointPrice?: number;
  orderPrice?: number;
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
