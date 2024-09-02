export enum SysConfigScope {
  app = 'app',
  appRedis = 'app.redis',
  rdkafkaGlobal = 'rdkafka.global',
  rdkafkaProducer = 'rdkafka.producer',
  rdkafkaConsumer = 'rdkafka.consumer',
  oflow = 'oflow',
}

export enum ValueType {
  integer = 'integer',
  number = 'number',
  string = 'string',
  boolean = 'boolean',
  json = 'json',
}

export const TrueValues = [
  'true',
  'True',
  'TRUE',
  'yes',
  'Yes',
  'YES',
  'on',
  'On',
  'ON',
  '1',
];
