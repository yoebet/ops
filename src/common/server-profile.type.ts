import { ExchangeCode } from '@/db/models/exchange-types';

export enum ServerRole {
  StrategyWorker = 'StrategyWorker',
  PaperTradeWorker = 'PaperTradeWorker',
  BacktestWorker = 'BacktestWorker',
  ExDataLoaderWorker = 'ExDataLoaderWorker',
  Worker = 'Worker',
  Admin = 'Admin',
}

export interface TaskScope {
  exCodes?: ExchangeCode[];
  baseCoins?: string[];
}

export type ServerProfile = {
  [t in ServerRole]?: TaskScope;
} & {
  httpPort?: number;
};
