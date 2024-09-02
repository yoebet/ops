import { TestConfigType } from '@/test/test-config.type';

export const TestConfig: TestConfigType = {
  kafka: {
    brokerList: 'localhost:9092',
  },
  exchange: {
    socksProxyUrl: 'socks://127.0.0.1:7890',
  },
};
