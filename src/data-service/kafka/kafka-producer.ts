import * as Rx from 'rxjs';
import { errorRetry, wrapOnNext } from '@/common/utils/rx';
import {
  DeliveryReport,
  LibrdKafkaError,
  MessageKey,
  Metadata,
  NumberNullUndefined,
  Producer,
  ReadyInfo,
} from 'node-rdkafka';
import { ProducerGlobalConfig, ProducerTopicConfig } from 'node-rdkafka/config';
import { KafkaCli, KafkaProducerOptions } from '@/data-service/kafka/kafka-cli';
import { wait } from '@/common/utils/utils';
import {
  mergeProducerConfig,
  mergeProducerTopicConfig,
} from '@/data-service/kafka/config';

const QUEUE_FULL_DELAY = 100;

export class KafkaProducer<T = any> extends KafkaCli {
  protected producer: Producer;

  protected partitioner?: (d: T) => NumberNullUndefined;
  protected keyGenerator?: (d: T) => MessageKey;

  constructor(
    protected producerConf: ProducerGlobalConfig,
    protected topicConf: ProducerTopicConfig,
    protected options: KafkaProducerOptions<T>,
  ) {
    super(options);
    this.producerConf = mergeProducerConfig(producerConf);
    this.topicConf = mergeProducerTopicConfig(topicConf);
    this.partitioner = options.partitioner;
    this.keyGenerator = options.keyGenerator;
  }

  start() {
    const producer = new Producer(this.producerConf, this.topicConf);
    this.producer = producer;

    producer.on('disconnected', this.onDisconnected.bind(this));
    producer.on('ready', this.onReady.bind(this));
    producer.on('connection.failure', this.onConnectionFailure.bind(this));
    producer.on('event.error', this.onEventError.bind(this));
    producer.on('event.stats', this.onEventStats.bind(this));
    producer.on('event.log', this.onEventLog.bind(this));
    producer.on('event.event', this.onEventEvent.bind(this));
    producer.on('event.throttle', this.onEventThrottle.bind(this));

    producer.on('delivery-report', this.onDeliveryReport.bind(this));

    this.producer.connect();
  }

  protected onReady(info: ReadyInfo, metadata: Metadata) {
    super.onReady(info, metadata);
    this.producer.setPollInterval(this.options.producerPollInterval || 100);
  }

  protected onDeliveryReport(error: LibrdKafkaError, report: DeliveryReport) {
    if (error) {
      this.logger.error(error);
    }
    this.logger.debug(report);
  }

  disconnect() {
    if (this.producer) {
      this.producer.disconnect(this.disconnectCb.bind(this));
    }
  }

  private queueFullAttempt = 0;

  private async doProduce(
    topic: string,
    partition: NumberNullUndefined,
    buffer: Buffer,
    key?: MessageKey,
  ) {
    try {
      const ts = Date.now();
      this.producer.produce(topic, partition, buffer, key, ts);
      this.queueFullAttempt = 0;
      if (!this.firstMessageAt) {
        this.firstMessageAt = ts;
      }
      this.lastMessageAt = ts;
      this.messageCount++;
    } catch (e) {
      if (e.message.match(/Queue full/)) {
        this.queueFullAttempt++;
        if (this.queueFullAttempt === 1) {
          this.producer.poll();
        } else if (this.queueFullAttempt === 3) {
          this.logger.error(e);
        } else if (this.queueFullAttempt % 10 === 0) {
          this.logger.error(this.queueFullAttempt + ', ' + e.message);
        }
        await wait(QUEUE_FULL_DELAY);
        await this.doProduce(topic, partition, buffer, key);
      } else {
        throw e;
      }
    }
  }

  async produce(topic: string, message: T) {
    if (!this.producer) {
      this.logger.error('not started.');
      return;
    }
    if (!this.producer.isConnected()) {
      this.logger.warn('not connected, wait ...');
      await this.forReady();
    }
    if (message == null) {
      this.logger.warn(`message: ${message}`);
      return;
    }
    let partition = undefined;
    if (this.partitioner) {
      partition = this.partitioner(message);
    }
    let key = undefined;
    if (this.keyGenerator) {
      key = this.keyGenerator(message);
    }
    const json = JSON.stringify(message);
    const buffer = Buffer.from(json);
    await this.doProduce(topic, partition, buffer, key);

    if (this.logger.isLevelEnabled('verbose')) {
      this.logger.verbose(topic + ':' + json);
    }
  }

  publish(
    topicMapper: string | ((d: T) => string),
    subject: Rx.Observable<T>,
  ): void {
    let topic: string;
    if (typeof topicMapper === 'string') {
      topic = topicMapper;
      if (!this.topics.includes(topic)) {
        throw new Error(`unknown topic: ${topic}`);
      }
    }
    const source = subject.pipe(
      errorRetry({
        logger: this.logger,
        subject: topic,
      }),
    );
    this.waitForReady()
      .pipe(Rx.switchMap((s) => source))
      .subscribe(
        wrapOnNext({
          next: async (message: T) => {
            if (typeof topicMapper === 'string') {
              await this.produce(topic, message);
            } else {
              topic = topicMapper(message);
              await this.produce(topic, message);
            }
          },
          logger: this.logger,
          subject: topic,
        }),
      );
  }

  addTopic(topic: string) {
    if (this.topics.includes(topic)) {
      return;
    }
    this.topics.push(topic);
  }
}
