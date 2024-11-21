export interface StrategyJobData {
  strategyId: number;
}

export enum StrategyAlgo {
  MV = 'MV',
}

export interface MVStartupParams {
  waitForPercent?: number;
  activePercent?: number;
  drawbackPercent: number;
}
