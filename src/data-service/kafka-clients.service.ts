import { Injectable, OnModuleInit } from '@nestjs/common';
import { isEmpty } from 'lodash';
import { AppLogger } from '@/common/app-logger';
import { SysConfigService } from '@/common-services/sys-config.service';
import { SysConfigScope } from '@/common/sys-config.type';
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
import { wait } from '@/common/utils/utils';

@Injectable()
export class KafkaClientsService implements OnModuleInit {
  protected consumerConfig: ConsumerGlobalConfig;
  protected producerConfig: ProducerGlobalConfig;

  private consumerClients = new Map<string, KafkaConsumer>();
  private producerClients = new Map<string, KafkaProducer>();

  private initOk = false;

  constructor(
    private sysConfigService: SysConfigService,
    private logger: AppLogger,
  ) {
    logger.setContext('kafka-clients');
  }

  async onModuleInit() {
    const configs = await this.sysConfigService.getScopesConfigs(
      SysConfigScope.rdkafkaGlobal,
      SysConfigScope.rdkafkaConsumer,
      SysConfigScope.rdkafkaProducer,
    );
    const commonConfig: GlobalConfig = configs[SysConfigScope.rdkafkaGlobal];
    const consumerConfig: GlobalConfig =
      configs[SysConfigScope.rdkafkaConsumer];
    const producerConfig: GlobalConfig =
      configs[SysConfigScope.rdkafkaProducer];

    this.logger.debug(commonConfig, `kafka: common config`);
    if (!isEmpty(consumerConfig)) {
      this.logger.debug(consumerConfig, `kafka: consumer config`);
    }
    if (!isEmpty(producerConfig)) {
      this.logger.debug(producerConfig, `kafka: producer config`);
    }

    this.consumerConfig = { ...commonConfig, ...consumerConfig };
    this.producerConfig = { ...commonConfig, ...producerConfig };
    this.initOk = true;
  }

  getConsumerClient<T>(clientKey: string): KafkaConsumer | undefined {
    return this.consumerClients.get(clientKey);
  }

  getProducerClient<T>(clientKey: string): KafkaProducer | undefined {
    return this.producerClients.get(clientKey);
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
    while (!this.initOk) {
      await wait(100);
    }
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
