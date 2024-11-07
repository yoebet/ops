import { ExchangeCode } from '@/exchange/exchanges-types';

export enum ServerRole {
  Worker = 'Worker',
  Admin = 'Admin',
}

export interface TaskScope {
  exCodes?: ExchangeCode[];
  baseCoins?: string[];
}

export interface ServerProfile {
  httpPort?: number;
  [ServerRole.Worker]?: TaskScope;
  [ServerRole.Admin]?: TaskScope;
}
