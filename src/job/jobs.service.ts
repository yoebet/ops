import {
  INestApplication,
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import {
  Queue,
  Job,
  JobsOptions,
  QueueOptions,
  WorkerOptions,
  WorkerListener,
  QueueListener,
  QueueEventsListener,
  Worker,
} from 'bullmq';
import { RedisOptions } from 'ioredis';
import { AppLogger } from '@/common/app-logger';
import { ConfigService } from '@nestjs/config';
import { Config } from '@/common/config.types';
import { TaskScope } from '@/common/server-profile.type';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { createBullBoard } from '@bull-board/api';

export interface JobSpec<D = any, R = any> {
  queueName: string;
  queueOptions?: QueueOptions;
  queueListener?: Partial<QueueListener<D, R, string>>;
  queueEventsListener?: Partial<QueueEventsListener>;

  processJob: (job: Job<D, R>) => Promise<R>;
  workerOptions?: Partial<WorkerOptions>;
  workerListener?: Partial<WorkerListener<D, R>>;

  defaultJobOptions?: JobsOptions;
}

export interface QueueAndWorker<D = any, R = any> extends JobSpec<D, R> {
  queue: Queue<D, R>;
  worker?: Worker<D, R>;
}

export interface JobFacade<D = any, R = any> {
  addTask(
    // queueName: string,
    jobData: D,
    jobOptions?: JobsOptions,
  ): Promise<void>;

  getQueue(): Queue<D, R>;

  // getWorker(): Worker<D, R>;
}

@Injectable()
export class JobsService implements OnModuleInit, OnApplicationShutdown {
  // private jobSpecs = new Map<string, JobSpec>();
  private queueWorkerMap = new Map<string, QueueAndWorker>();

  private connection: RedisOptions;

  app: INestApplication;
  private boardOperators: ReturnType<typeof createBullBoard>;
  private boardSetup = false;
  private workerStarted = false;

  constructor(
    private configService: ConfigService<Config>,
    private logger: AppLogger,
  ) {
    this.connection = {
      ...configService.get('redis'),
      ...configService.get('bullmq.redis' as any),
    };
    logger.setContext('jobs');
  }

  onModuleInit() {
    this.setupBoard();
  }

  defineJob<D, R>(spec: JobSpec<D, R>): JobFacade<D, R> {
    const queueName = spec.queueName;
    const queue = new Queue(queueName, {
      ...spec.queueOptions,
      connection: this.connection,
    });
    const qj: QueueAndWorker = {
      ...spec,
      queue,
    };
    this.queueWorkerMap.set(queueName, qj);
    if (this.workerStarted) {
      this.runQueue(qj).catch((e) => this.logger.error(e));
    }
    if (this.boardSetup) {
      this.boardOperators.addQueue(new BullMQAdapter(queue));
    }
    return {
      addTask: async (jobData: D, jobOptions?: JobsOptions) => {
        await this.addTask(queueName, jobData, jobOptions);
      },
      getQueue: (): Queue<D, R> => {
        return queue;
      },
    };
  }

  async addTask(
    queueName: string,
    jobData: any,
    jobOptions?: JobsOptions,
  ): Promise<void> {
    const qj = this.queueWorkerMap.get(queueName);
    if (!qj) {
      throw new Error(`not defined.`);
    }
    await qj.queue.add(queueName, jobData, {
      ...qj.defaultJobOptions,
      ...jobOptions,
    });
  }

  private async runQueue(qj: QueueAndWorker) {
    let worker = qj.worker;
    if (worker) {
      if (worker.isRunning()) {
        return;
      }
      await worker.run();
    } else {
      worker = qj.worker = new Worker(qj.queueName, qj.processJob, {
        ...qj.workerOptions,
        connection: this.connection,
      });
    }
    const { workerListener: wl } = qj;
    worker.on('completed', (job, result, prev) => {
      if (wl?.completed) {
        wl.completed(job, result, prev);
      } else {
        this.logger.log(`${job.id} has completed!`, qj.queueName);
      }
    });
    worker.on('failed', (job, err, prev) => {
      if (wl?.failed) {
        wl.failed(job, err, prev);
      } else {
        this.logger.error(`${job.id} has failed: ${err.message}`, qj.queueName);
      }
    });
  }

  async startWorker(_profile?: TaskScope) {
    this.logger.log(`:::: start ...`);
    for (const qj of this.queueWorkerMap.values()) {
      await this.runQueue(qj);
    }
    this.workerStarted = true;
  }

  setupBoard() {
    if (!this.app) {
      return;
    }
    this.logger.log(`:::: setup task board`);

    const BasePath = '/jobs/board';

    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath(BasePath);

    const queues = [...this.queueWorkerMap.values()].map((tq) => tq.queue);
    const adapters = queues.map((q) => new BullMQAdapter(q));

    this.boardOperators = createBullBoard({
      queues: adapters,
      serverAdapter,
    });

    const router = serverAdapter.getRouter();

    this.app.use(BasePath, router);
    this.boardSetup = true;
  }

  bullBoardAddQueue(queueName: string) {
    const queue = new Queue(queueName, {
      connection: this.connection,
    });
    this.boardOperators.addQueue(new BullMQAdapter(queue));
  }

  bullBoardRemoveQueue(queueName: string) {
    this.boardOperators.removeQueue(queueName);
  }

  shutdown() {
    this.logger.warn(`shutdown ...`);
    for (const { queue, worker } of this.queueWorkerMap.values()) {
      queue.close().catch((e) => this.logger.error(e));
      if (worker && worker.isRunning()) {
        worker.close().catch((e) => this.logger.error(e));
      }
    }
  }

  onApplicationShutdown(_signal?: string): any {
    this.shutdown();
  }
}
