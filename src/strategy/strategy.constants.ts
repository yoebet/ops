import { MINUTE_MS } from '@/common/utils/utils';

export const IntenseWatchThreshold = 0.3; // 0.3%
export const IntenseWatchExitThreshold = 0.1; // 0.1%

// job
export const WorkerMaxStalledCount = 2;
export const WorkerStalledInterval = MINUTE_MS;
export const WorkerConcurrency = 30;

export const ReportStatusInterval = WorkerStalledInterval >> 1;

export const DefaultBaselineSymbol = 'BTC/USDT';

export const FeeAndSlippageRate = 0.001;

export const DefaultBollingerBandN = 20;
export const DefaultBollingerBandK = 2;
