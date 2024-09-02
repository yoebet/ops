import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { LogLevel } from '@nestjs/common/services/logger.service';
import { LoggerOptions } from 'typeorm/logger/LoggerOptions';
import { isArray, mergeWith } from 'lodash';
import { GatewayMetadata } from '@nestjs/websockets/interfaces/gateway-metadata.interface';
import { ServerProfile } from '@/common/server-profile.type';

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

export interface OrderFlowWsConfig {
  cors?: GatewayMetadata['cors'];
  adminUi?: WsAdminUIConfig;
}

export interface KafkaConfig {
  clientId: string;
  consumerGroupId: string;
}

export interface AuthConfig {
  bs?: string;
  jwtSecret: string;
  extraSecrets?: {
    [bs: string]: string;
  };
}

export interface Config {
  http: HttpConfig;
  db: Partial<ConnectionOptions>;
  log: LogConfig;
  kafkaConfig: KafkaConfig;
  orderFlowWs: OrderFlowWsConfig;
  restAgents?: string[];
  wsAgentUrl?: string;
  auth: AuthConfig;
  predefinedProfiles: Record<string, ServerProfile>;
  serverProfile: string;
  serverNodeId: string;
}

export type PartialConfig = Partial<Config>;

export function mergeConfig(a: PartialConfig, b: PartialConfig) {
  return mergeWith(a, b, (objValue, srcValue) => {
    if (isArray(srcValue)) {
      return srcValue;
    }
  });
}
