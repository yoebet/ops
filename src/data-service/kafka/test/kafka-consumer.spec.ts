import { KafkaConsumer } from '@/data-service/kafka/kafka-consumer';
import { wait } from '@/common/utils/utils';
import { TestConfig } from '@/test/test-config.spec';
import { AppLogger } from '@/common/app-logger';
import { Trade1 } from '@/data-service/models/trade1';
import { ExchangeCode } from '@/exchange/exchanges-types';

jest.setTimeout(300_000);

const logger = AppLogger.build('consumer');

describe('kafka consumer', () => {
  it('ticker', async () => {
    const topic = 'ticker_btc';
    const consumer = new KafkaConsumer<Trade1>(
      {
        'metadata.broker.list': TestConfig.kafka.brokerList,
        'group.id': 'test-1',
      },
      {
        'auto.offset.reset': 'largest',
      },
      {
        topics: [topic],
      },
    );
    consumer.start();

    const obs = consumer.getSubject(topic);
    obs.subscribe((v) => logger.debug(v, topic));

    await wait(250_000);
    consumer.disconnect();
  });

  it('kline', async () => {
    const topic = 'kline_1s_btc';
    const consumer = new KafkaConsumer<Trade1>(
      {
        'metadata.broker.list': TestConfig.kafka.brokerList,
        'group.id': 'test-1',
      },
      {
        'auto.offset.reset': 'largest',
      },
      {
        topics: [topic],
      },
    );
    consumer.start();

    const obs = consumer.getSubject(topic);
    obs.subscribe(console.log);

    await wait(250_000);
    consumer.disconnect();
  });

  it('fpkl', async () => {
    const topic = 'fpkl_1s_p1_btc';
    const consumer = new KafkaConsumer<Trade1>(
      {
        'metadata.broker.list': TestConfig.kafka.brokerList,
        'group.id': 'test-1',
      },
      {
        'auto.offset.reset': 'largest',
      },
      {
        topics: [topic],
      },
    );
    consumer.start();

    const obs = consumer.getSubject(topic);
    obs.subscribe(console.log);

    await wait(250_000);
    consumer.disconnect();
  });
});
