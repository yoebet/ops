import { PlaceOrderParams } from '@/exchange/exchange-service.types';
import { TradeSide } from '@/data-service/models/base';
import { ExOrder } from '@/db/models/ex-order';

export enum StrategyAlgo {
  // MVB = 'MVB',
  // MVS = 'MVS',
  // MVBS = 'MVBS',
  // BR = 'BR',
  // FDB = 'FDB',
  // FDS = 'FDS',
  // LS = 'LS',
  INT = 'INT',
}

export enum OppCheckerAlgo {
  MV = 'MV',
  BR = 'BR',
  FP = 'FP',
  LS = 'LS',
  JP = 'JP',
}

// export enum ConsiderSide {
//   buy = 'buy',
//   sell = 'sell',
//   both = 'both',
// }

export declare type ConsiderSide = TradeSide | 'both';

// runners

export class ExitSignal extends Error {}

export interface TradeOpportunity {
  orderTag?: string;
  side: TradeSide;
  orderPrice?: number;
  order?: ExOrder;
  params?: PlaceOrderParams;
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
  startingPrice?: number;
  activePercent?: number;
  drawbackPercent: number;
}

export interface PriceDiffParams {
  waitForTriggerPercent?: number;
  priceDiffPercent?: number;
  startingPrice?: number;
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
  limitPriceDiffPercent?: number;
}

export interface LSCheckerParams {
  interval: string;
  periods: number;
  checkPeriods: number;
  contrastPeriods: number;
  amountTimes: number;
  priceChangeTimes: number;
  limitPriceDiffPercent?: number;
}

export interface JumpCheckerParams {
  interval: string;
  jumpPeriods: number;
  stopPeriods: number;
  priceChangeTimes: number;
  limitPriceDiffPercent?: number;
}

export interface StopLossParams {
  limitPriceDiffPercent?: number;
}

// strategies:

export interface CommonStrategyParams {
  // open?: any;
  // close?: any;
  stopLoss?: StopLossParams;
  lossCoolDownInterval?: string;
  minCloseInterval?: string;
  maxCloseInterval?: string;
}

export interface OpportunityCheckerMV extends MVCheckerParams {
  algo: OppCheckerAlgo.MV;
}

export interface OpportunityCheckerBR extends BRCheckerParams {
  algo: OppCheckerAlgo.BR;
}

export interface OpportunityCheckerFP extends PriceDiffParams {
  algo: OppCheckerAlgo.FP;
}

export interface OpportunityCheckerLS extends LSCheckerParams {
  algo: OppCheckerAlgo.LS;
}

export interface OpportunityCheckerJP extends JumpCheckerParams {
  algo: OppCheckerAlgo.JP;
}

export type CheckOpportunityParams =
  | OpportunityCheckerMV
  | OpportunityCheckerBR
  | OpportunityCheckerFP
  | OpportunityCheckerLS
  | OpportunityCheckerJP;

export interface IntegratedStrategyParams extends CommonStrategyParams {
  open?: CheckOpportunityParams;
  close?: CheckOpportunityParams;
}

export interface MVStrategyParams {
  open: MVCheckerParams;
  close?: MVCheckerParams;
}

export interface BRStrategyParams {
  open: BRCheckerParams;
  close: MVCheckerParams;
}
