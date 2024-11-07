import { AdminClient, Producer } from 'node-rdkafka';
import { wait } from '@/common/utils/utils';
import { TestConfig } from '@/env.local.test';

jest.setTimeout(500_000);

const brokerUrl = TestConfig.kafka.brokerList;
const testTopic = 'test-1';

describe('nd-kafka delete', () => {
  it('delete topic s', async () => {
    const admin = AdminClient.create({
      'client.id': 'rd-client',
      'metadata.broker.list': brokerUrl,
    });
    // await admin.createTopic({
    //   topic: 'test-2',
    //   num_partitions: 1,
    //   replication_factor: 1,
    // });
    admin.deleteTopic('test-2');
    admin.deleteTopic('ticker_btc');
    admin.deleteTopic('ex_ticker_btc');
    await wait(5_000);
  });
});

describe('nd-kafka', () => {
  it('produce-1', async () => {
    const producer = new Producer({
      'client.id': 'rd-client',
      'metadata.broker.list': brokerUrl,
      dr_cb: true,
    });

    producer.setPollInterval(100);
    producer.connect();

    producer.on('ready', function () {
      try {
        producer.produce(
          testTopic,
          null,
          Buffer.from(
            `from rdkafka ${Math.random()} @ ${new Date().toISOString()}`,
          ),
          'Stormwind',
          Date.now(),
        );
      } catch (err) {
        console.error('A problem occurred when sending our message');
        console.error(err);
      }
    });

    producer.on('event.error', function (err) {
      console.error('Error from producer');
      console.error(err);
    });

    producer.on('delivery-report', function (err, report) {
      console.log(report);
    });

    await wait(100_000);
  });

  it('delete topic', async () => {
    const admin = AdminClient.create({
      'client.id': 'rd-client',
      'metadata.broker.list': brokerUrl,
    });
    // for (const topic of Object.values(DataSource)) {
    //   await admin.deleteTopic(topic);
    // }
    admin.deleteTopic('test-1', (v) => {
      console.log(v);
    });
    await wait(5_000);
  });

  it('produce-Ticker', async () => {
    const producer = new Producer({
      'client.id': 'rd-client',
      'metadata.broker.list': brokerUrl,
      dr_cb: true,
    });

    producer.setPollInterval(100);
    producer.connect();

    producer.on('ready', async function () {
      const data = {
        symbol: 'testSymbol',
        base: 'base',
        quote: 'quote',
        time: new Date(),
        price: 123,
      };

      try {
        producer.produce(
          'ticker_btc',
          null,
          Buffer.from(JSON.stringify(data)),
          'Stormwind',
          Date.now(),
        );
        await wait(200);
      } catch (err) {
        console.error('A problem occurred when sending our message');
        console.error(err);
      }
    });

    producer.on('event.error', function (err) {
      console.error('Error from producer');
      console.error(err);
    });

    producer.on('delivery-report', function (err, report) {
      console.log(report);
    });

    await wait(2_000);
  });

  it('produce-KLine', async () => {
    const producer = new Producer({
      'client.id': 'rd-client',
      'metadata.broker.list': brokerUrl,
      dr_cb: true,
    });

    producer.setPollInterval(100);
    producer.connect();

    producer.on('ready', function () {
      const data = {
        ex: 'binance',
        // market: ExMarket.spot,
        symbol: 'testSymbol',
        // base: 'base',
        // quote: 'quote',
        interval: '1h',
        ts: Date.now(),
        size: 0, // 基础币种量
        amount: 0, // 计价币种量
        open: 0,
        high: 0,
        low: 0,
        close: 0,
        bs: 0,
        ba: 0,
        ss: 0,
        sa: 0,
        tds: 0,
      };

      try {
        producer.produce(
          'kline_1s_btc',
          null,
          Buffer.from(JSON.stringify(data)),
          'Stormwind',
          Date.now(),
        );
      } catch (err) {
        console.error('A problem occurred when sending our message');
        console.error(err);
      }
    });

    producer.on('event.error', function (err) {
      console.error('Error from producer');
      console.error(err);
    });

    producer.on('delivery-report', function (err, report) {
      console.log(report);
    });

    await wait(2_000);
  });
});
