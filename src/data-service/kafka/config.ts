import {
  ConsumerGlobalConfig,
  ConsumerTopicConfig,
  GlobalConfig,
  ProducerGlobalConfig,
  ProducerTopicConfig,
} from 'node-rdkafka/config';
import { Env } from '@/env';

const globalConfig: GlobalConfig = {
  // 'metadata.broker.list': '',
  'client.id': Env.kafkaConfig.clientId,
};

// ************

export const producerConfig: ProducerGlobalConfig = {
  ...globalConfig,
};

export const consumerConfig: ConsumerGlobalConfig = {
  ...globalConfig,
  'group.id': Env.kafkaConfig.consumerGroupId,
  'enable.auto.commit': false,
};

// topic config

export const producerTopicConfig: ProducerTopicConfig = {
  acks: 0,
};

export const consumerTopicConfig: ConsumerTopicConfig = {
  'auto.offset.reset': 'largest',
};

// merge default config

export function mergeProducerConfig(
  config: ProducerGlobalConfig,
): ProducerGlobalConfig {
  return {
    ...producerConfig,
    ...config,
  };
}

export function mergeConsumerConfig(
  config: ConsumerGlobalConfig,
): ConsumerGlobalConfig {
  return {
    ...consumerConfig,
    ...config,
  };
}

export function mergeProducerTopicConfig(
  config: ProducerTopicConfig,
): ProducerTopicConfig {
  return {
    ...producerTopicConfig,
    ...config,
  };
}

export function mergeConsumerTopicConfig(
  config: ConsumerTopicConfig,
): ConsumerTopicConfig {
  return {
    ...consumerTopicConfig,
    ...config,
  };
}
