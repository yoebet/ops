import { LocalConfig } from '@/env.local';
import { Config, mergeConfig, PartialConfig } from './common/config.types';

const TestConfig0: PartialConfig = {
  kafka: {
    brokerList: 'localhost:9092',
  },
  exchange: {
    socksProxies: ['socks://127.0.0.1:1080'],
  },
};

export const TestConfig = mergeConfig(LocalConfig, TestConfig0) as Config;
