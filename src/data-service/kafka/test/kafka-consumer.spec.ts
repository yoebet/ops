import { KafkaConsumer } from '@/data-service/kafka/kafka-consumer';
import { wait } from '@/common/utils/utils';
import { TestConfig } from '@/env.local.tset';

jest.setTimeout(300_000);

describe('kafka consumer', () => {
  it('kline', async () => {
    const topic = 'kline_1s_btc';
    const consumer = new KafkaConsumer<any>(
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
