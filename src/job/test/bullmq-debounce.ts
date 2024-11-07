import { Job, Queue, Worker } from 'bullmq';
import { TestConfig } from '@/env.local.test';
import { bullmqRedis } from '@/common/config.types';

const connection = bullmqRedis(TestConfig);

const myQueue = new Queue('Paint', { connection });

const worker = new Worker(
  'Paint',
  async (job: Job) => {
    console.log('Do something with job');
    return 'some value';
  },
  { connection },
);

worker.on('completed', (job: Job, returnvalue: any) => {
  console.log('worker done painting', new Date());
});

worker.on('failed', (job: Job, error: Error) => {
  console.error('worker fail painting', job, error, new Date());
});

// Add only one job that will be delayed at least 1 second.
myQueue.add('house', { color: 'white' }, { delay: 1000, jobId: 'house' });
myQueue.add('house', { color: 'white' }, { delay: 1000, jobId: 'house' });
myQueue.add('house', { color: 'white' }, { delay: 1000, jobId: 'house' });
myQueue.add('house', { color: 'white' }, { delay: 1000, jobId: 'house' });
myQueue.add('house', { color: 'white' }, { delay: 1000, jobId: 'house' });
myQueue.add('house', { color: 'white' }, { delay: 1000, jobId: 'house' });
myQueue.add('house', { color: 'white' }, { delay: 1000, jobId: 'house' });
