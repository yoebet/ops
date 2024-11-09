import { Queue, Worker } from 'bullmq';
import { wait } from '@/common/utils/utils';
import { TestConfig } from '@/env.local.test';
import { bullmqRedis } from '@/common/config.types';

jest.setTimeout(100_000);

const connection = bullmqRedis(TestConfig);

it('bullmq add task', async () => {
  const testQueue = new Queue('test-queue1', { connection });
  await testQueue.add('rollup-1', { foo: 'bar' });
  await testQueue.add('rollup-2', { qux: 'baz' });
});

it('bullmq run', async () => {
  const worker = new Worker(
    'test-queue1',
    async (job) => {
      console.log(job.data);
    },
    { connection },
  );
  // await worker.run();

  worker.on('completed', (job) => {
    console.log(`${job.id} has completed!`);
  });

  worker.on('failed', (job, err) => {
    console.log(`${job.id} has failed with ${err.message}`);
  });

  await wait(100_000);
});

it('bullmq remove', async () => {
  const testQueue1 = new Queue('test-cli-r', { connection });
  // await testQueue1.drain(true);
  // await testQueue1.clean(1000, 100, 'failed');
  console.log(`remove ...`);
  const jobs = await testQueue1.getJobs(['active', 'waiting']);
  for (const job of jobs) {
    console.log(job.asJSON());
    const r = await testQueue1.remove(job.id);
    console.log(`remove: ${r}`);
  }
});

it('bullmq get active', async () => {
  const testQueue1 = new Queue('test-cli-r', { connection });
  console.log(`active:`);
  const jobs = await testQueue1.getActive();
  for (const job of jobs) {
    console.log(job.asJSON());
  }
});
