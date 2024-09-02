import { Observable, Subject } from 'rxjs';
import { ConsumerGlobalConfig, ConsumerTopicConfig } from 'node-rdkafka/config';
import {
  EofEvent,
  KafkaConsumer as Consumer,
  LibrdKafkaError,
  Message,
  Metadata,
  ReadyInfo,
  SubscribeTopicList,
  TopicPartition,
  TopicPartitionOffset,
} from 'node-rdkafka';
import {
  ConnStatus,
  KafkaCli,
  KafkaCliOptions,
} from '@/data-service/kafka/kafka-cli';
import {
  mergeConsumerConfig,
  mergeConsumerTopicConfig,
} from '@/data-service/kafka/config';

export class KafkaConsumer<T = any> extends KafkaCli {
  protected consumer: Consumer;

  protected subjectsMap = new Map<string, Subject<T>>();

  constructor(
    protected consumerConf: ConsumerGlobalConfig,
    protected topicConf: ConsumerTopicConfig,
    protected options: KafkaCliOptions,
  ) {
    super(options);
    this.consumerConf = mergeConsumerConfig(consumerConf);
    this.topicConf = mergeConsumerTopicConfig(topicConf);
  }

  protected ensureSubject(topic: string): Subject<T> {
    if (!this.topics.includes(topic)) {
      throw new Error(`unknown topic: ${topic}`);
    }
    let subject = this.subjectsMap.get(topic);
    if (!subject) {
      subject = new Subject<T>();
      this.subjectsMap.set(topic, subject);
    }
    return subject;
  }

  start() {
    const consumer = new Consumer(this.consumerConf, this.topicConf);
    this.consumer = consumer;

    consumer.on('disconnected', this.onDisconnected.bind(this));
    consumer.on('ready', this.onReady.bind(this));
    consumer.on('connection.failure', this.onConnectionFailure.bind(this));
    consumer.on('event.error', this.onEventError.bind(this));
    consumer.on('event.stats', this.onEventStats.bind(this));
    consumer.on('event.log', this.onEventLog.bind(this));
    consumer.on('event.event', this.onEventEvent.bind(this));
    consumer.on('event.throttle', this.onEventThrottle.bind(this));

    consumer.on('data', this.onData.bind(this));
    consumer.on('partition.eof', this.onPartitionEof.bind(this));
    consumer.on('rebalance', this.onRebalance.bind(this));
    consumer.on('rebalance.error', this.onRebalanceError.bind(this));

    consumer.on('subscribed', this.onSubscribed.bind(this));
    consumer.on('unsubscribe', this.onUnsubscribe.bind(this));
    consumer.on('unsubscribed', this.onUnsubscribed.bind(this));

    consumer.on('offset.commit', this.onOffsetCommit.bind(this));

    consumer.connect();
  }

  protected onReady(info: ReadyInfo, metadata: Metadata) {
    super.onReady(info, metadata);

    this.consumer.subscribe(this.topics);

    this.consumer.consume();
  }

  protected onData(data: Message) {
    if (this.logger.isLevelEnabled('verbose')) {
      const dd = { ...data };
      delete dd.value;
      this.logger.verbose(dd);
    }
    if (data.value === null) {
      return;
    }
    const topic = data.topic;
    const json = String(data.value);
    try {
      const obj = JSON.parse(json);
      const subject = this.ensureSubject(topic);
      subject.next(obj);
    } catch (e) {
      this.logger.error(e);
    }
    const ts = Date.now();
    if (!this.firstMessageAt) {
      this.firstMessageAt = ts;
    }
    this.lastMessageAt = ts;
    this.messageCount++;
  }

  protected onPartitionEof(arg: EofEvent) {
    this.logger.log(arg);
  }

  protected onRebalance(err: LibrdKafkaError, assignments: TopicPartition[]) {
    if (err) {
      this.logger.error(err);
    }
  }

  protected onRebalanceError(err: Error) {
    this.logger.error(err);
  }

  // connectivity events

  protected onSubscribed(topics: SubscribeTopicList) {
    this.logger.debug(topics);
  }

  protected onUnsubscribe() {
    this.logger.verbose('unsubscribe');
  }

  protected onUnsubscribed() {
    this.logger.debug('unsubscribed');
    this.statusSubject.next(ConnStatus.na);
  }

  // offsets

  protected onOffsetCommit(
    error: LibrdKafkaError,
    topicPartitions: TopicPartitionOffset[],
  ) {
    if (error) {
      this.logger.error(error);
    }
  }

  public disconnect() {
    if (this.consumer) {
      this.consumer.disconnect(this.disconnectCb.bind(this));
    }
  }

  getSubject(topic: string): Observable<T> {
    const subject = this.ensureSubject(topic);
    return subject.asObservable();
  }
}
