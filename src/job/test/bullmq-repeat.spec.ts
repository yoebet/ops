import { Job, Queue, Worker } from 'bullmq';
import { parseExpression } from 'cron-parser';
import { wait } from '@/common/utils/utils';
import { TestConfig } from '@/env.local.tset';
import { bullmqRedis } from '@/common/config.types';
import { JobsOptions } from 'bullmq/dist/esm/types';

const HOUR = 60 * 60 * 1000;
jest.setTimeout(HOUR);

const connection = bullmqRedis(TestConfig);

const repeatableJobQueue = 'test-r';

it('cron-exp', async () => {
  const interval = parseExpression('0 0/5 * * * *', {
    currentDate: new Date(),
    iterator: true,
    utc: true,
  });
  const ds: string[] = [];
  for (let i = 0; i < 10; i++) {
    const obj = interval.next();
    ds.push(obj.value.toISOString());
  }
  console.log(ds);
});

it('add repeatable', async () => {
  const testQueue = new Queue(repeatableJobQueue, { connection });

  const opts: JobsOptions = {
    repeat: {
      pattern: '0 0/3 * * * *',
      utc: true,
    },
    // parent: {
    //   id: '123',
    //   queue: '234',
    // },
  };
  await testQueue.add('xx', { foo: 'bar' }, opts);
  await testQueue.add('yy', { qux: 'baz' }, opts);
});

it('run repeatable', async () => {
  const worker = new Worker(
    repeatableJobQueue,
    async (job: Job) => {
      console.log(job.data);
      return 'some value';
    },
    {
      connection,
      // autorun: false,
    },
  );

  worker.on('completed', (job: Job, returnvalue: any) => {
    console.log('worker done painting', new Date());
  });

  worker.on('failed', (job: Job, error: Error) => {
    console.error('worker fail painting', job, error, new Date());
  });

  // await worker.run();

  await wait(HOUR);
});

it('check repeatable', async () => {
  const testQueue1 = new Queue(repeatableJobQueue, { connection });
  console.log(`repeatable:`);
  const jobs = await testQueue1.getJobSchedulers();
  for (const job of jobs) {
    console.log(job);
    // const r = await testQueue1.remove(job.id);
    // console.log(`remove: ${r}`);
  }

  await wait(100_000);
});
