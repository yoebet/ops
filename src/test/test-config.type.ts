export interface TestConfigType {
  kafka: {
    brokerList?: string;
  };
  exchange: {
    socksProxyUrl?: string;
  };
}
