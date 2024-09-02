import { Injectable } from '@nestjs/common';
import { AppLogger } from '@/common/app-logger';
import { Observable } from 'rxjs';
import { KafkaClientsService } from '@/data-service/kafka-clients.service';
import {
  RtFpKline,
  RtKline,
  RtPrice,
  RtTicker,
} from '@/data-service/models/realtime';

export interface ChannelProducer<T> {
  produce(topic: string, message: T): Promise<void>;
}

export interface ChannelConsumer<T> {
  getSubject(topic: string): Observable<T>;
}

@Injectable()
export class DataChannelService {
  constructor(
    private kafkaClientsService: KafkaClientsService,
    private logger: AppLogger,
  ) {
    logger.setContext('data-channel');
  }

  getPriceTopic(baseCoin: string) {
    // RtPrice
    return `price_${baseCoin ? baseCoin.toLowerCase() : '0'}`;
  }

  getTickerTopic(baseCoin: string) {
    // RtTicker
    return `ticker_${baseCoin ? baseCoin.toLowerCase() : '0'}`;
  }

  getKlineTopic(baseCoin: string, interval: string) {
    // RtKline
    return `kline_${interval}_${baseCoin ? baseCoin.toLowerCase() : '0'}`;
  }

  getFpKlineTopic(baseCoin: string, interval: string, prl: number) {
    // RtFpKline
    return `fpkl_${interval}_p${prl}_${
      baseCoin ? baseCoin.toLowerCase() : '0'
    }`;
  }

  async getOrBuildProducer<T>(
    clientKey: string,
    loggerContext?: string,
  ): Promise<ChannelProducer<T>> {
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
  }

  async getPriceProducer(
    clientKey: string,
    loggerContext?: string,
  ): Promise<ChannelProducer<RtPrice>> {
    return this.getOrBuildProducer<RtPrice>(clientKey, loggerContext);
  }

  async getTickerProducer(
    clientKey: string,
    loggerContext?: string,
  ): Promise<ChannelProducer<RtTicker>> {
    return this.getOrBuildProducer<RtTicker>(clientKey, loggerContext);
  }

  async getKlineProducer(
    clientKey: string,
    loggerContext?: string,
  ): Promise<ChannelProducer<RtKline>> {
    return this.getOrBuildProducer<RtKline>(clientKey, loggerContext);
  }

  async getFpKlineProducer(
    clientKey: string,
    loggerContext?: string,
  ): Promise<ChannelProducer<RtFpKline>> {
    return this.getOrBuildProducer<RtFpKline>(clientKey, loggerContext);
  }

  getOrBuildConsumer<T>(
    topics: string[],
    loggerContext: string,
  ): ChannelConsumer<T> {
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
  }
}
