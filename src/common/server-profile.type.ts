import { ExchangeCode } from '@/exchange/exchanges-types';

export enum ServerRole {
  Exws = 'Exws',
  Worker = 'Worker',
  Admin = 'Admin',
  DataServer = 'DataServer',
}

export interface TaskScope {
  exCodes?: ExchangeCode[];
  baseCoins?: string[];
}

export interface ServerProfile {
  httpPort?: number;
  [ServerRole.Exws]?: TaskScope;
  [ServerRole.Worker]?: TaskScope;
  [ServerRole.DataServer]?: TaskScope;
}
