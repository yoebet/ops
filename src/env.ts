import { LocalConfig } from '@/env.local';
import {
  Config,
  ConnectionOptions,
  mergeConfig,
  PartialConfig,
} from './common/config.types';
import { ServerRole } from '@/common/server-profile.type';

export const DB_SCHEMA = 'st';

const DefaultConfig: PartialConfig = {
  http: {
    host: '0.0.0.0',
    port: 5000,
  },
  db: {
    name: DB_SCHEMA,
    schema: DB_SCHEMA,
    type: 'postgres',
    database: 'ops',
    host: 'postgres',
    port: 25432,
  },
  redis: {
    host: 'localhost',
    port: 26379,
  },
  bullmq: {
    redis: {
      db: 2,
    },
  },
  log: {
    levels: ['log', 'error', 'warn'],
    dbLogger: {
      options: 'all',
      simplifySql: true,
    },
  },
  kafka: {
    brokerList: 'localhost:9092',
    clientId: 'ops1',
    consumerGroupId: 'ops1',
  },
  exchange: {
    // socksProxies: ['socks://127.0.0.1:1080'],
    publishKafka: false,
  },
  oflow: {
    base: 'http://localhost:5000',
    wsPath: '/oflow/ws',
  },
  auth: {
    bs: 'pr',
    jwtSecret: 'af7f25f9-92fc-401c-9cb1-8f50f4d9c3ce',
  },
  predefinedProfiles: {
    RunAll: {
      httpPort: 5000,
      // [ServerRole.Exws]: {},
      [ServerRole.Worker]: {},
      [ServerRole.Admin]: {},
    },
    [ServerRole.Worker]: {
      httpPort: 7000,
      [ServerRole.Worker]: {},
    },
    [ServerRole.Admin]: {
      httpPort: 5000,
      [ServerRole.Admin]: {},
    },
  },
  serverProfile: ServerRole.Admin,
  serverNodeId: 'prod',
};

export const Env = mergeConfig(DefaultConfig, LocalConfig) as Config;

export const DbConfig = Env.db as ConnectionOptions;

export default (): Config => Env;
