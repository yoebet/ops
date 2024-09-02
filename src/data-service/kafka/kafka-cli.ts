import {
  ClientMetrics,
  LibrdKafkaError,
  MessageKey,
  Metadata,
  NumberNullUndefined,
  ReadyInfo,
} from 'node-rdkafka';
import * as Rx from 'rxjs';
import { AppLogger } from '@/common/app-logger';

export interface KafkaCliOptions {
  logger?: AppLogger;
  loggerContext?: string;
  topics: string[];
}

export interface KafkaProducerOptions<T = any> extends KafkaCliOptions {
  producerPollInterval?: number; // ms
  partitioner?: (d: T) => NumberNullUndefined;
  keyGenerator?: (d: T) => MessageKey;
}

export enum ConnStatus {
  na = 'na', // not available
  ready = 'ready',
}

export interface CliStat {
  context: string;
  connection: number;
  firstMessageAt?: string;
  lastMessageAt?: string;
  messageCount: number;
}

export class KafkaCli {
  protected logger: AppLogger;
  protected topics: string[];

  protected statusSubject = new Rx.BehaviorSubject<ConnStatus>(ConnStatus.na);

  protected connectionCount = 0;
  protected firstMessageAt?: number;
  protected lastMessageAt?: number;
  protected messageCount = 0;

  constructor(protected options: KafkaCliOptions) {
    this.topics = options.topics;
    let context = options.loggerContext;
    if (!context && this.topics.length === 1) {
      context = this.topics[0];
    }
    const clientType = this.constructor.name.replace('Kafka', '').toLowerCase();
    this.logger = AppLogger.from(
      options.logger,
      `kafka-${clientType}:${context || ''}`,
    );
  }

  getTopics(): string[] {
    return this.topics ? [...this.topics] : [];
  }

  getStat(): CliStat {
    return {
      context: this.logger['context'],
      connection: this.connectionCount,
      firstMessageAt: this.firstMessageAt
        ? new Date(this.firstMessageAt).toISOString()
        : undefined,
      lastMessageAt: this.lastMessageAt
        ? new Date(this.lastMessageAt).toISOString()
        : undefined,
      messageCount: this.messageCount,
    };
  }

  // connectivity events

  protected onDisconnected(metrics: ClientMetrics) {
    this.logger.warn('disconnected');
    this.logger.log(metrics);
    this.statusSubject.next(ConnStatus.na);
  }

  protected onReady(info: ReadyInfo, metadata: Metadata) {
    this.logger.log('ready');
    this.logger.debug('topics:' + metadata.topics.length);
    this.connectionCount++;
    this.statusSubject.next(ConnStatus.ready);
  }

  waitForReady(): Rx.Observable<any> {
    return this.statusSubject
      .asObservable()
      .pipe(Rx.first((status) => status === ConnStatus.ready));
  }

  async forReady() {
    await Rx.firstValueFrom(this.waitForReady());
  }

  protected onConnectionFailure(
    error: LibrdKafkaError,
    metrics: ClientMetrics,
  ) {
    this.logger.error('connection failure');
    this.logger.error(error);
    this.logger.log(metrics);
  }

  // event messages

  protected onEventError(error: LibrdKafkaError) {
    this.logger.error(error);
  }

  protected onEventStats(eventData: any) {
    this.logger.debug(eventData);
  }

  protected onEventLog(eventData: any) {
    this.logger.log(eventData);
  }

  protected onEventEvent(eventData: any) {
    this.logger.log(eventData);
  }

  protected onEventThrottle(eventData: any) {
    this.logger.log(eventData);
  }

  protected disconnectCb(err: any, metrics: ClientMetrics) {
    if (err) {
      this.logger.error(err);
    }
    this.logger.warn(`disconnectCb.`);
    this.logger.log(metrics);
    this.statusSubject.next(ConnStatus.na);
  }
}
