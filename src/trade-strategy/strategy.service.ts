import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { Equal, IsNull, Or } from 'typeorm';
import { Exchanges } from '@/exchange/exchanges';
import { AppLogger } from '@/common/app-logger';
import { ExPublicWsService } from '@/data-ex/ex-public-ws.service';
import { ExPrivateWsService } from '@/data-ex/ex-private-ws.service';
import { Strategy } from '@/db/models/strategy';
import { StrategyEnv, StrategyJobEnv } from '@/trade-strategy/env/strategy-env';
import { MoveTracingBuy } from '@/trade-strategy/strategy/move-tracing-buy';
import { ExPublicDataService } from '@/data-ex/ex-public-data.service';
import { ExOrderService } from '@/ex-sync/ex-order.service';
import { StrategyEnvTrade } from '@/trade-strategy/env/strategy-env-trade';
import { StrategyEnvMockTrade } from '@/trade-strategy/env/strategy-env-mock-trade';
import { JobFacade, JobsService } from '@/job/jobs.service';
import { MockOrderTracingService } from '@/trade-strategy/mock-order-tracing.service';
import { BaseRunner } from '@/trade-strategy/strategy/base-runner';
import { StrategyAlgo, StrategyJobData } from '@/trade-strategy/strategy.types';
import { BurstMonitor } from '@/trade-strategy/strategy/burst-monitor';
import { createNewDealIfNone } from '@/trade-strategy/strategy.utils';
import {
  WorkerMaxStalledCount,
  WorkerConcurrency,
  WorkerStalledInterval,
} from '@/trade-strategy/strategy.constants';
import { MINUTE_MS, wait } from '@/common/utils/utils';
import { MoveTracingSell } from '@/trade-strategy/strategy/move-tracing-sell';
import { MoveTracingBothSide } from '@/trade-strategy/strategy/move-tracing-both-side';

@Injectable()
export class StrategyService implements OnModuleInit {
  private strategyJobFacades = new Map<
    StrategyAlgo,
    JobFacade<StrategyJobData>
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

  onModuleInit(): any {
    for (const code of Object.values(StrategyAlgo)) {
      const facade = this.jobsService.defineJob<StrategyJobData, any>({
        queueName: `strategy/${code}`,
        processJob: this.runStrategyJob.bind(this),
        workerOptions: {
          maxStalledCount: WorkerMaxStalledCount,
          stalledInterval: WorkerStalledInterval,
          concurrency: WorkerConcurrency,
        },
      });
      this.strategyJobFacades.set(code, facade);
    }
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

  async runStrategyJob(job: Job<StrategyJobData>) {
    const { strategyId } = job.data;
    const strategy = await Strategy.findOneBy({ id: strategyId });
    if (!strategy) {
      throw new Error(`strategy ${strategyId} not found`);
    }
    await this.runStrategy(strategy, job);
  }

  async runStrategy(strategy: Strategy, job?: Job<StrategyJobData>) {
    const env = this.prepareEnv(strategy, job);
    const jobFacade = this.strategyJobFacades.get(strategy.algoCode);
    if (!jobFacade) {
      throw new Error(`jobFacade ${strategy.algoCode} not found`);
    }
    const queue = jobFacade.getQueue();
    const service = this;
    const jobEnv: StrategyJobEnv = {
      thisJob: job,
      queuePaused: queue.isPaused.bind(queue),
      summitNewDealJob: () => service.doSummitJob(strategy),
    };
    const logContext = `${strategy.algoCode}/${strategy.id}`;
    const logger = this.logger.subLogger(logContext);

    let runner: BaseRunner;
    switch (strategy.algoCode) {
      case StrategyAlgo.BR:
        runner = new BurstMonitor(strategy, env, jobEnv, logger);
        break;
      case StrategyAlgo.MVB:
        runner = new MoveTracingBuy(strategy, env, jobEnv, logger);
        break;
      case StrategyAlgo.MVS:
        runner = new MoveTracingSell(strategy, env, jobEnv, logger);
        break;
      case StrategyAlgo.MVBS:
        runner = new MoveTracingBothSide(strategy, env, jobEnv, logger);
        break;
      default:
        throw new Error(`unknown strategy ${strategy.algoCode}`);
    }

    await wait(Math.round(10 * 1000 * Math.random()));

    await runner.run();
  }

  protected async doSummitJob(strategy: Strategy) {
    const jobFacade = this.strategyJobFacades.get(strategy.algoCode);
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
