import { PlaceOrderParams } from '@/exchange/exchange-service-types';
import { TradeSide } from '@/data-service/models/base';

export enum StrategyAlgo {
  MV = 'MV',
  BR = 'BR',
}

export class ExitSignal extends Error {}

export interface CheckOpportunityReturn {
  placeOrder?: boolean;
  orderTag?: string;
}

export interface StrategyJobData {
  strategyId: number;
  dealId?: number;
  runOneDeal?: boolean;
}

export interface TraceOrderJobData {
  strategyId: number;
  params: PlaceOrderParams;
}

export interface MVStartupParams {
  waitForPercent?: number;
  activePercent?: number;
  drawbackPercent: number;
  newDealTradeSide?: TradeSide;
}

export declare type WatchLevel =
  | 'hibernate' // 2h
  | 'sleep' // 30m
  | 'snap' // 5m
  | 'loose' // 1m
  | 'medium' // 20s
  | 'high' // 5s
  | 'intense'; // ws
