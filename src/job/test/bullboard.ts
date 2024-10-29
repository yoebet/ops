import { bullmqRedis } from '@/common/config.types';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { createBullBoard } from '@bull-board/api';
import { TestConfig } from '@/env.local.tset';
import { Queue } from 'bullmq';
import express from 'express';

const connection = bullmqRedis(TestConfig);

const someQueue = new Queue('someQueueName', {
  connection,
});

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const _operators = createBullBoard({
  queues: [new BullMQAdapter(someQueue)],
  serverAdapter: serverAdapter,
});

const app = express();

app.use('/admin/queues', serverAdapter.getRouter());

// other configurations of your server

app.listen(3000, () => {
  console.log('Running on 3000...');
  console.log('For the UI, open http://localhost:3000/admin/queues');
});
