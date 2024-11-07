import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppLogger } from '@/common/app-logger';
import { KafkaConsumer } from '@/data-service/kafka/kafka-consumer';
import {
  ConsumerGlobalConfig,
  ConsumerTopicConfig,
  GlobalConfig,
  ProducerGlobalConfig,
  ProducerTopicConfig,
} from 'node-rdkafka/config';
import {
  KafkaCliOptions,
  KafkaProducerOptions,
} from '@/data-service/kafka/kafka-cli';
import { KafkaProducer } from '@/data-service/kafka/kafka-producer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KafkaClientsService implements OnModuleInit {
  protected consumerConfig: ConsumerGlobalConfig;
  protected producerConfig: ProducerGlobalConfig;

  private consumerClients = new Map<string, KafkaConsumer>();
  private producerClients = new Map<string, KafkaProducer>();

  constructor(
    private configService: ConfigService,
    private logger: AppLogger,
  ) {
    logger.setContext('kafka-clients');
  }

  async onModuleInit() {
    const kafkaConfig = this.configService.get('kafka');
    const commonConfig: GlobalConfig = {
      'metadata.broker.list': kafkaConfig['brokerList'],
      'client.id': kafkaConfig['clientId'],
    };
    this.consumerConfig = {
      ...commonConfig,
      'group.id': kafkaConfig['consumerGroupId'],
      'security.protocol': 'plaintext',
    };
    this.producerConfig = { ...commonConfig };
  }

  getOrBuildConsumer<T>(
    clientKey: string,
    topicConf: ConsumerTopicConfig,
    options: KafkaCliOptions,
  ): KafkaConsumer {
    let cli = this.consumerClients.get(clientKey);
    if (cli) {
      return cli;
    }
    cli = new KafkaConsumer<T>(this.consumerConfig, topicConf, options);
    this.consumerClients.set(clientKey, cli);
    cli.start();
    return cli;
  }

  async getOrBuildProducer<T>(
    clientKey: string,
    topicConf: ProducerTopicConfig,
    options: KafkaProducerOptions<T>,
  ): Promise<KafkaProducer> {
    let cli = this.producerClients.get(clientKey);
    if (cli) {
      return cli;
    }
    cli = new KafkaProducer<T>(this.producerConfig, topicConf, options);
    this.producerClients.set(clientKey, cli);
    cli.start();
    return cli;
  }

  getConsumerStats() {
    return [...this.consumerClients.values()].map((cli) => cli.getStat());
  }

  getProducerStats() {
    return [...this.producerClients.values()].map((cli) => cli.getStat());
  }
}
