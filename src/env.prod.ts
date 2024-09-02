import { PartialConfig, mergeConfig } from '@/common/config.types';
import { ServerRole } from '@/common/server-profile.type';
import * as process from 'node:process';

const base: PartialConfig = {
  db: {
    // host: 'localhost',
    // host: '192.168.64.1',
    host: 'host.docker.internal',
    port: 15432,
    database: 'tm',
    username: 'tm',
    password: 'ASHooQxZtsw8BZm2MotjbP',
    poolSize: 50,
  },
  log: {
    levels: ['log', 'error', 'warn', 'debug'],
    dbLogger: {
      options: ['error', 'warn'],
      highlightSql: true,
    },
  },
  kafkaConfig: {
    clientId: 'prod',
    consumerGroupId: 'prod-1',
  },
  orderFlowWs: {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://18.167.194.75:9000',
        'https://hxr.com',
        'https://dev.hxr.com',
        'https://alpha.hxr.com',
        'https://bitchat.ai',
        'https://dev.bitchat.ai',
        'https://alpha.bitchat.ai',
      ],
      credentials: true,
    },
    adminUi: {
      auth: {
        username: 'admin',
        password:
          '$2a$10$Zth3IXJeWSJBrZdhVpbYa.iWRbbM78PYblNEKGJZiK2tkKJ8cgXpe',
      },
      readonly: false,
      mode: 'development',
    },
  },
  auth: {
    bs: 'pr',
    jwtSecret: 'af7f25f9-92fc-401c-9cb1-8f50f4d9c3ce',
    extraSecrets: {
      de: '566e58db-995e-4eaf-93f1-1a88fef7ba71',
      al: '4859b7ea-c75c-479d-af37-07881f9b873e',
    },
  },
  // serverProfile: ServerRole.TickerProducer,
  // serverProfile: ServerRole.DataPublisher,
  serverProfile: process.env.SERVER_PROFILE || ServerRole.OflowServer,
  serverNodeId: process.env.SERVER_NODE_ID || 'prod',
};

export const LocalConfig = base;
