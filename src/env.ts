import { LocalConfig } from '@/env.local';
import {
  Config,
  ConnectionOptions,
  mergeConfig,
  PartialConfig,
} from './common/config.types';
import { ServerRole } from '@/common/server-profile.type';
import { ExchangeCode } from '@/exchange/exchanges-types';

export const DB_SCHEMA = 'tm';

const DefaultConfig: PartialConfig = {
  http: {
    host: '0.0.0.0',
    port: 5000,
  },
  db: {
    name: DB_SCHEMA,
    schema: DB_SCHEMA,
    type: 'postgres',
    database: 'tm',
    host: 'postgres',
    port: 15432,
  },
  log: {
    levels: ['log', 'error', 'warn'],
    dbLogger: {
      options: 'all',
      simplifySql: true,
    },
  },
  kafkaConfig: {
    clientId: 'dev1',
    consumerGroupId: 'dev1',
  },
  orderFlowWs: {
    cors: {
      // origin: '*',
      origin: ['http://localhost', 'http://localhost:3000'],
      credentials: true,
    },
  },
  predefinedProfiles: {
    runAll: {
      httpPort: 5000,
      [ServerRole.TickerProducer]: {},
      [ServerRole.DataPublisher]: {},
      [ServerRole.OflowServer]: {},
    },
    [ServerRole.TickerProducer]: {
      httpPort: 6500,
      [ServerRole.TickerProducer]: {
        // exCodes: [ExchangeCode.binance],
      },
    },
    [ServerRole.DataPublisher]: {
      httpPort: 7000,
      [ServerRole.DataPublisher]: {},
    },
    [ServerRole.OflowServer]: {
      httpPort: 5000,
      [ServerRole.OflowServer]: {},
    },
  },
  serverProfile: ServerRole.OflowServer,
  serverNodeId: 'prod',
};

export const Env = mergeConfig(DefaultConfig, LocalConfig) as Config;

export const DbConfig = Env.db as ConnectionOptions;

export default (): Config => Env;
