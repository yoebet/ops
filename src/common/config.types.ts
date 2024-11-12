import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { LogLevel } from '@nestjs/common/services/logger.service';
import { LoggerOptions } from 'typeorm/logger/LoggerOptions';
import { isArray, mergeWith } from 'lodash';
import { ServerProfile } from '@/common/server-profile.type';
import { RedisOptions } from 'ioredis';
import { ExAccountCode } from '@/db/models/exchange-types';

import { ExApiKey } from '@/exchange/base/rest/rest.type';

export interface HttpConfig {
  host?: string;
  port: number;
}

export interface DbLoggerConfig {
  options?: LoggerOptions;
  simplifySql?: boolean;
  highlightSql?: boolean;
}

export interface LogConfig {
  levels?: LogLevel[];
  dbLogger?: DbLoggerConfig;
}

export type ConnectionOptions = PostgresConnectionOptions;

export interface WsAdminUIConfig {
  auth?:
    | false
    | {
        username: string;
        // https://bcrypt-generator.com/
        password: string;
      };
  readonly?: boolean;
  mode?: 'development' | 'production';
}

export interface KafkaConfig {
  brokerList?: string;
  clientId?: string;
  consumerGroupId?: string;
}

export interface AuthConfig {
  bs?: string;
  jwtSecret: string;
  extraSecrets?: {
    [bs: string]: string;
  };
}

export interface OflowServerConfig {
  base: string;
  wsPath: string;
}

export interface Config {
  http: HttpConfig;
  db: Partial<ConnectionOptions>;
  redis: RedisOptions;
  bullmq: {
    redis: RedisOptions;
  };
  log: LogConfig;
  kafka: KafkaConfig;
  oflow: OflowServerConfig;
  exchange: {
    socksProxies?: string[];
    publishKafka?: boolean;
    apiKeys?: {
      [ex in ExAccountCode]?: ExApiKey;
    };
  };
  auth: AuthConfig;
  predefinedProfiles: Record<string, ServerProfile>;
  serverProfile: string;
  serverNodeId: string;
}

export type PartialConfig = Partial<Config>;

export function mergeConfig(obj: PartialConfig, source: PartialConfig) {
  return mergeWith(obj, source, (objValue, srcValue) => {
    if (isArray(srcValue)) {
      return srcValue;
    }
  });
}

export function bullmqRedis(config: Config): RedisOptions {
  return {
    ...config.redis,
    ...config.bullmq.redis,
  };
}
