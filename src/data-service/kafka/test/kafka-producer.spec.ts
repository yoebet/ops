import * as Rx from 'rxjs';
import { wait } from '@/common/utils/utils';
import { TestConfig } from '@/env.local.tset';
import { AppLogger } from '@/common/app-logger';
import { KafkaProducer } from '@/data-service/kafka/kafka-producer';
import {
  testDataSource1,
  TestMessage1,
} from '@/data-service/kafka/test/common.spec';

jest.setTimeout(300_000);

const topic = 'test-1';
const logger = AppLogger.build('producer');

describe('kafka', () => {
  it('producer', async () => {
    const producer = new KafkaProducer<TestMessage1>(
      {
        'metadata.broker.list': TestConfig.kafka.brokerList,
      },
      {
        acks: 1,
      },
      {
        topics: [topic],
      },
    );
    producer.start();

    const source = testDataSource1().pipe(
      Rx.tap((m) => {
        logger.log(`${m.n}, ${m.d}, ${m.r}`);
      }),
    );
    producer.publish(topic, source);

    await wait(250_000);
    producer.disconnect();
  });
});
