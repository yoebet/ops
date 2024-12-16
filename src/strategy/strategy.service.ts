import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { Equal, IsNull, Or } from 'typeorm';
import { Exchanges } from '@/exchange/exchanges';
import { AppLogger } from '@/common/app-logger';
import { ExPublicWsService } from '@/data-ex/ex-public-ws.service';
import { ExPrivateWsService } from '@/data-ex/ex-private-ws.service';
import { Strategy } from '@/db/models/strategy/strategy';
import { StrategyEnv, StrategyJobEnv } from '@/strategy/env/strategy-env';
import { ExPublicDataService } from '@/data-ex/ex-public-data.service';
import { ExOrderService } from '@/ex-sync/ex-order.service';
import { StrategyEnvTrade } from '@/strategy/env/strategy-env-trade';
import { StrategyEnvMockTrade } from '@/strategy/env/strategy-env-mock-trade';
import { JobFacade, JobsService } from '@/job/jobs.service';
import { MockOrderTracingService } from '@/strategy/mock-order-tracing.service';
import { BaseRunner } from '@/strategy/strategy/base-runner';
import {
  OppCheckerAlgo,
  StrategyAlgo,
  StrategyJobData,
} from '@/strategy/strategy.types';
import { createNewDealIfNone } from '@/strategy/strategy.utils';
import {
  WorkerConcurrency,
  WorkerMaxStalledCount,
  WorkerStalledInterval,
} from '@/strategy/strategy.constants';
import { MINUTE_MS, wait } from '@/common/utils/utils';
import { IntegratedStrategy } from '@/strategy/strategy/integrated-strategy';

@Injectable()
export class StrategyService implements OnModuleInit {
  private strategyJobFacades = new Map<
    string,
    JobFacade<StrategyJobData, string>
  >();

  constructor(
    private exchanges: Exchanges,
    private publicDataService: ExPublicDataService,
    private publicWsService: ExPublicWsService,
    private privateWsService: ExPrivateWsService,
    private exOrderService: ExOrderService,
    private jobsService: JobsService,
    private mockOrderTracingService: MockOrderTracingService,
    private logger: AppLogger,
  ) {
    logger.setContext('Strategy');
  }

  onModuleInit(): any {}

  start() {
    this.logger.log(`:::: start ...`);

    for (const code of Object.values(StrategyAlgo)) {
      for (const oca of Object.values(OppCheckerAlgo)) {
        const queueName = this.genStrategyQueueName(code, oca);
        const facade = this.jobsService.defineJob<StrategyJobData, string>({
          queueName,
          processJob: this.runStrategyJob.bind(this),
          workerOptions: {
            maxStalledCount: WorkerMaxStalledCount,
            stalledInterval: WorkerStalledInterval,
            concurrency: WorkerConcurrency,
          },
        });
        this.strategyJobFacades.set(queueName, facade);
      }
    }

    this.mockOrderTracingService.start();
  }

  private genStrategyQueueName(
    code: StrategyAlgo,
    oca: OppCheckerAlgo,
  ): string {
    return `strategy/${code}/${oca}`;
  }

  private prepareEnv(
    strategy: Strategy,
    job?: Job<StrategyJobData>,
  ): StrategyEnv {
    if (strategy.paperTrade) {
      return new StrategyEnvMockTrade(
        strategy,
        job,
        this.publicDataService,
        this.publicWsService,
        this.mockOrderTracingService,
        this.logger.newLogger(`${strategy.name}.mock-env`),
      );
    }
    return new StrategyEnvTrade(
      strategy,
      job,
      this.exchanges,
      this.publicDataService,
      this.publicWsService,
      this.privateWsService,
      this.exOrderService,
      this.logger.newLogger(`${strategy.name}.env`),
    );
  }

  async runStrategyJob(job: Job<StrategyJobData>): Promise<string> {
    const { strategyId } = job.data;
    const strategy = await Strategy.findOneBy({ id: strategyId });
    if (!strategy) {
      throw new Error(`strategy ${strategyId} not found`);
    }
    return this.runStrategy(strategy, job);
  }

  async runStrategy(
    strategy: Strategy,
    job?: Job<StrategyJobData>,
  ): Promise<string> {
    const { algoCode, openAlgo, closeAlgo, openDealSide } = strategy;
    const env = this.prepareEnv(strategy, job);
    const qn = this.genStrategyQueueName(algoCode, openAlgo);
    const jobFacade = this.strategyJobFacades.get(qn);
    if (!jobFacade) {
      throw new Error(`jobFacade ${algoCode} not found`);
    }
    const queue = jobFacade.getQueue();
    const service = this;
    const jobEnv: StrategyJobEnv = {
      thisJob: job,
      queuePaused: queue.isPaused.bind(queue),
      summitNewDealJob: () => service.doSummitJob(strategy),
    };
    const logContext = `${openAlgo}-${closeAlgo}/${openDealSide}/${strategy.id}`;
    const logger = this.logger.subLogger(logContext);

    let runner: BaseRunner;
    switch (algoCode) {
      case StrategyAlgo.INT:
        runner = new IntegratedStrategy(strategy, env, jobEnv, logger);
        break;
      default:
        throw new Error(`unknown strategy ${algoCode}`);
    }

    await wait(Math.round(10 * 1000 * Math.random()));

    return runner.run();
  }

  protected async doSummitJob(strategy: Strategy) {
    const { algoCode, openAlgo } = strategy;
    const qn = this.genStrategyQueueName(algoCode, openAlgo);
    const jobFacade = this.strategyJobFacades.get(qn);
    if (!jobFacade) {
      throw new Error(`jobFacade ${strategy.algoCode} not found`);
    }
    await createNewDealIfNone(strategy);
    const strategyId = strategy.id;
    const dealId = strategy.currentDealId;
    await jobFacade.addTask(
      { strategyId, dealId, runOneDeal: true },
      {
        jobId: `s${strategyId}/${dealId}`,
        attempts: 10,
        backoff: MINUTE_MS,
      },
    );
  }

  async summitJob(strategyId: number, force?: boolean) {
    const strategy = await Strategy.findOneBy({ id: strategyId });
    if (!strategy) {
      throw new Error(`strategy ${strategyId} not found`);
    }
    if (!force) {
      if (strategy.jobSummited) {
        this.logger.log(`strategy job summited`);
        return;
      }
      if (!strategy.active) {
        this.logger.log(`strategy job not active`);
        return;
      }
    }
    await this.doSummitJob(strategy);
    if (!strategy.jobSummited || !strategy.active) {
      strategy.jobSummited = true;
      strategy.active = true;
      await strategy.save();
    }
  }

  async summitAllJobs() {
    const strategies = await Strategy.findBy({
      active: true,
      jobSummited: Or(IsNull(), Equal(false)),
    });
    for (const strategy of strategies) {
      await this.doSummitJob(strategy);
      await Strategy.update(strategy.id, { jobSummited: true });
    }
  }
}
