import { Test } from '@nestjs/testing';
import { wait } from '@/common/utils/utils';
import { JobsModule } from '@/job/jobs.module';
import { JobsService } from '@/job/jobs.service';
import { Job } from 'bullmq';

const HOUR = 60 * 60 * 1000;

jest.setTimeout(HOUR);

export interface JobData1 {
  n: number;
  r: number;
}

async function processJob(job: Job<JobData1, string>): Promise<string> {
  const jd = job.data;
  console.log(`> ${jd.n}, ${jd.r}`);
  job.progress = 10;
  await wait(jd.r * 10_000);
  if (jd.r > 0.7) {
    console.log('aho');
    throw new Error('' + jd.n);
  }
  job.progress = 90;
  return '' + jd.n;
}

describe('Jobs', () => {
  let service: JobsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JobsModule],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(JobsService);
  });

  describe('run', () => {
    it('r', async () => {
      const facade = service.defineJob({
        queueName: 'TJ',
        processJob,
      });

      await facade.addTask({ n: 22, r: Math.random() });

      await service.startWorker();

      await wait(HOUR);
    });
  });
});
