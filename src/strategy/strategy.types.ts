import { PlaceOrderParams } from '@/exchange/exchange-service.types';
import { TradeSide } from '@/data-service/models/base';
import { ExOrder, OrderTag } from '@/db/models/ex-order';

export enum StrategyAlgo {
  INT = 'INT',
}

export enum OppCheckerAlgo {
  MV = 'MV',
  BR = 'BR',
  TP = 'TP',
  LS = 'LS',
  JP = 'JP',
}

export declare type ConsiderSide = TradeSide | 'both';

// runners

export class ExitSignal extends Error {}

export interface TradeOpportunity {
  orderTag?: OrderTag;
  side: TradeSide;
  orderPrice?: number;
  order?: ExOrder;
  params?: PlaceOrderParams;
  memo?: string;
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
  // strategyId: number;
  orderId: number;
  // params: PlaceOrderParams;
}

// checkers

export interface MVCheckerParams {
  waitForPercent?: number;
  startingPrice?: number;
  activePercent?: number;
  drawbackPercent: number;
  // cancelCheckOnDeviatePercent?: number;
}

export interface TpslParams {
  waitForPercent?: number;
  priceDiffPercent?: number;
  startingPrice?: number;
  // cancelOrderOnDeviatePercent?: number;
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
  baselineSymbol?: string;
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
  priceDiffPercent?: number;
}

// strategies:

export interface OpportunityCheckerMV extends MVCheckerParams {
  algo: OppCheckerAlgo.MV;
}

export interface OpportunityCheckerBR extends BRCheckerParams {
  algo: OppCheckerAlgo.BR;
}

export interface OpportunityCheckerFP extends TpslParams {
  algo: OppCheckerAlgo.TP;
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

export interface CommonStrategyParams<ORP, CRP = ORP> {
  open?: ORP;
  close?: CRP;
  stopLoss?: StopLossParams;
  lossCoolDownInterval?: string;
  minCloseInterval?: string;
  maxCloseInterval?: string;
}

export type IntegratedStrategyParams =
  CommonStrategyParams<CheckOpportunityParams>;
