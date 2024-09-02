import { ExchangeCode } from '@/exchange/exchanges-types';

export enum ServerRole {
  TickerProducer = 'TickerProducer',
  DataPublisher = 'DataPublisher',
  OflowServer = 'OflowServer',
}

export interface TaskScope {
  exCodes?: ExchangeCode[];
  baseCoins?: string[];
}

export interface ServerProfile {
  httpPort?: number;
  [ServerRole.TickerProducer]?: TaskScope;
  [ServerRole.DataPublisher]?: TaskScope;
  [ServerRole.OflowServer]?: TaskScope;
}
