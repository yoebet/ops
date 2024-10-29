import * as Benchmark from 'benchmark';
import { Producer } from 'node-rdkafka';
import { ProducerGlobalConfig } from 'node-rdkafka/config';
import { wait } from '@/common/utils/utils';
import { TestConfig } from '@/env.local.tset';

// ref: https://github.com/tulios/kafkajs/issues/398

const N = parseInt(process.argv[2], 10) || 1;
const TOPIC = 'test-1';
const brokerUrl = TestConfig.kafka.brokerList;

console.log('N:', N, 'topic:', TOPIC);

// RDKAFKA
const rdProducerConf: ProducerGlobalConfig = {
  'metadata.broker.list': brokerUrl,
  'queue.buffering.max.ms': 10,
  'queue.buffering.max.messages': 100000,
  'queue.buffering.max.kbytes': 1048576,
};
const producerRD = new Producer(rdProducerConf);

producerRD.setPollInterval(2000);

// Workaround when produce() throws error
const rdProduceDelay = 100;
let rdProduceAttempt = 0;
const rdProduce = async (topic, message) => {
  try {
    producerRD.produce(topic, -1, message, null);
    rdProduceAttempt = 0;
  } catch (e) {
    // console.error(e);
    if (e.message.match(/Queue full/)) {
      rdProduceAttempt++;

      if (rdProduceAttempt === 1) {
        producerRD.poll();
      }

      await wait(rdProduceDelay);
      return rdProduce(topic, message);
    } else {
      throw e;
    }
  }
};
const produceMessagesRD = async (messages) => {
  return Promise.all(messages.map((message) => rdProduce(TOPIC, message)));
};

// Messages generator
const genMessage = () => ({
  number: Math.random(),
  date: new Date(),
});

const genBuffers = (N) => {
  const messages = [];
  N = N || 100;
  for (let i = 0; i < N; i++) {
    messages.push(Buffer.from(JSON.stringify(genMessage())));
  }
  return messages;
};

// Benchmark
// Benchmark.options.minSamples = 100;
// Benchmark.options.initCount = 2;

const suite = new Benchmark.Suite();

suite
  .add(`node-rdkafka.produce ${N} messages (type Buffer) one by one`, {
    defer: true,
    fn: (d) => {
      produceMessagesRD(genBuffers(N))
        .then(() => {
          d.resolve();
        })
        .catch(d.resolve);
    },
  })
  // add listeners
  .on('cycle', function (event) {
    console.log(String(event.target));
  })
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
    process.exit(0);
  });

producerRD.connect();

suite.run({
  async: false,
});
