import { MINUTE_MS } from '@/common/utils/utils';
import {
  BRCheckerParams,
  MVCheckerParams,
} from '@/trade-strategy/strategy.types';

export const IntenseWatchThreshold = 0.3; // 0.3%
export const IntenseWatchExitThreshold = 0.1; // 0.1%

// job
export const WorkerMaxStalledCount = 3;
export const WorkerStalledInterval = MINUTE_MS;
export const WorkerConcurrency = 10;

export const ReportStatusInterval = WorkerStalledInterval >> 1;

// default strategy params

export const DefaultBRCheckerParams: BRCheckerParams = {
  interval: '1m',
  periods: 16,
  checkPeriods: 2,
  contrastPeriods: 12,
  baselineAmountFlucTimes: 2,
  baselinePriceFlucTimes: 1.5,
  selfAmountFlucTimes: 5,
  selfPriceFlucTimes: 3,
};

export const defaultMVCheckerParams: MVCheckerParams = {
  waitForPercent: 1,
  drawbackPercent: 1,
};
