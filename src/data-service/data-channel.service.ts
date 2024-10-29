import { Injectable } from '@nestjs/common';
import { AppLogger } from '@/common/app-logger';
import { Observable, Subject } from 'rxjs';
import { KafkaClientsService } from '@/data-service/kafka-clients.service';
import { RtKline, RtPrice } from '@/data-service/models/realtime';
import { ConfigService } from '@nestjs/config';

export interface ChannelProducer<T> {
  produce(topic: string, message: T): Promise<void>;
}

export interface ChannelConsumer<T> {
  getSubject(topic: string): Observable<T>;
}

@Injectable()
export class DataChannelService {
  private exchangePublishKafka: boolean;
  private localChannels = new Map<string, Subject<any>>();

  constructor(
    private configService: ConfigService,
    private kafkaClientsService: KafkaClientsService,
    private logger: AppLogger,
  ) {
    logger.setContext('data-channel');
    this.exchangePublishKafka = configService.get('exchange.publishKafka');
  }

  getPriceTopic(baseCoin: string) {
    // RtPrice
    return `price_${baseCoin ? baseCoin.toLowerCase() : '0'}`;
  }

  getKlineTopic(baseCoin: string, interval: string) {
    // RtKline
    return `kline_${interval}_${baseCoin ? baseCoin.toLowerCase() : '0'}`;
  }

  private getOrBuildSubject<T>(topic: string) {
    let subject = this.localChannels.get(topic);
    if (!subject) {
      subject = new Subject<T>();
      this.localChannels.set(topic, subject);
    }
    return subject;
  }

  async getOrBuildProducer<T>(
    clientKey: string,
    loggerContext?: string,
  ): Promise<ChannelProducer<T>> {
    if (this.exchangePublishKafka) {
      const producer = await this.kafkaClientsService.getOrBuildProducer<T>(
        clientKey || 'default',
        {
          acks: 0,
        },
        { topics: [], loggerContext: loggerContext || clientKey },
      );
      return {
        async produce(topic: string, message: T) {
          await producer.produce(topic, message);
        },
      };
    } else {
      const channelService = this;
      return {
        async produce(topic: string, message: T) {
          const subject = channelService.getOrBuildSubject(topic);
          await subject.next(message);
        },
      };
    }
  }

  async getPriceProducer(
    clientKey: string,
    loggerContext?: string,
  ): Promise<ChannelProducer<RtPrice>> {
    return this.getOrBuildProducer<RtPrice>(clientKey, loggerContext);
  }

  async getKlineProducer(
    clientKey: string,
    loggerContext?: string,
  ): Promise<ChannelProducer<RtKline>> {
    return this.getOrBuildProducer<RtKline>(clientKey, loggerContext);
  }

  getOrBuildConsumer<T>(
    topics: string[],
    loggerContext: string,
  ): ChannelConsumer<T> {
    if (this.exchangePublishKafka) {
      const clientKey = topics.join('-');
      const consumer = this.kafkaClientsService.getOrBuildConsumer<T>(
        clientKey,
        {
          'auto.offset.reset': 'largest',
        },
        { topics, loggerContext },
      );

      return {
        getSubject(topic: string): Observable<T> {
          return consumer.getSubject(topic);
        },
      };
    } else {
      const channelService = this;
      return {
        getSubject(topic: string): Observable<T> {
          const subject = channelService.getOrBuildSubject(topic);
          return subject.asObservable();
        },
      };
    }
  }
}
