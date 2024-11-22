import { MINUTE_MS } from '@/common/utils/utils';

export const IntenseWatchThreshold = 0.3; // 0.3%
export const IntenseWatchExitThreshold = 0.1; // 0.1%

// job
export const WorkerMaxStalledCount = 10;
export const WorkerStalledInterval = MINUTE_MS;
export const WorkerConcurrency = 10;

export const ReportStatusInterval = 40 * 1000;
