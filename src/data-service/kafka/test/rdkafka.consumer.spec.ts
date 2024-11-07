import { AdminClient, KafkaConsumer, Producer } from 'node-rdkafka';
import { ConsumerGlobalConfig, ConsumerTopicConfig } from 'node-rdkafka/config';
import { wait } from '@/common/utils/utils';
import { TestConfig } from '@/env.local.test';

jest.setTimeout(500_000);

const brokerUrl = TestConfig.kafka.brokerList;
// const brokerUrl = '192.168.0.190';

const consumerConf: ConsumerGlobalConfig = {
  debug: 'all',
  'client.id': 'kafka',
  'group.id': 'kafka',
  'metadata.broker.list': brokerUrl,
  offset_commit_cb: (err, topicPartitions) => {
    if (err) {
      console.error(err);
    } else {
      console.log(topicPartitions);
    }
  },
};
const topicConf: ConsumerTopicConfig = {
  'auto.offset.reset': 'latest',
  // 'auto.offset.reset': 'beginning',
};

describe('rd-kafka-consumer', () => {
  it('price_btc-1', async () => {
    const stream = KafkaConsumer.createReadStream(
      { ...consumerConf, 'group.id': 'kafka-1' },
      topicConf,
      {
        topics: ['price_btc'],
      },
    );

    stream.on('data', function (message) {
      console.log(message.value.toString());
    });

    await wait(100_000);
  });

  it('ticker_btc-1', async () => {
    const stream = KafkaConsumer.createReadStream(
      { ...consumerConf, 'group.id': 'kafka-1' },
      topicConf,
      {
        topics: ['ticker_btc'],
      },
    );

    stream.on('data', function (message) {
      console.log(message.value.toString());
    });

    await wait(100_000);
  });

  it('ticker_btc-2', async () => {
    const consumer = new KafkaConsumer(
      { ...consumerConf, 'group.id': 'kafka-2' },
      topicConf,
    );

    consumer
      .on('ready', function () {
        consumer.subscribe(['ticker_btc']);

        // setInterval(function () {
        //   consumer.consume(10);
        //   // consumer.consume();
        // }, 1000);
        consumer.consume();
      })
      .on('data', function (data) {
        console.log(data.value.toString());
      });

    consumer.connect();

    await wait(100_000);
  });
});
