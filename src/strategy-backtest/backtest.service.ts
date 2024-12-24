import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job, JobState } from 'bullmq';
import { Equal, IsNull, Or } from 'typeorm';
import { AppLogger } from '@/common/app-logger';
import { BacktestStrategy } from '@/db/models/strategy/backtest-strategy';
import { StrategyJobEnv } from '@/strategy/env/strategy-env';
import { JobFacade, JobsService } from '@/job/jobs.service';
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
import { IntegratedStrategyBacktest } from '@/strategy-backtest/runner/integrated-strategy-backtest';
import { KlineDataService } from '@/data-service/kline-data.service';
import { BaseBacktestRunner } from '@/strategy-backtest/runner/base-backtest-runner';
import { ApiResult, ValueResult } from '@/common/api-result';
import { BacktestDeal } from '@/db/models/strategy/backtest-deal';
import { BacktestOrder } from '@/db/models/strategy/backtest-order';

@Injectable()
export class BacktestService implements OnModuleInit {
  private strategyJobFacades = new Map<
    string,
    JobFacade<StrategyJobData, string>
  >();

  constructor(
    protected klineDataService: KlineDataService,
    private jobsService: JobsService,
    private logger: AppLogger,
  ) {
    logger.setContext('BacktestStrategy');
  }

  onModuleInit(): any {}

  defineJobs() {
    this.logger.log(`:::: define jobs ...`);

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
  }

  private genStrategyQueueName(
    code: StrategyAlgo,
    oca: OppCheckerAlgo,
  ): string {
    return `back-test/${oca}`;
  }

  async runStrategyJob(job: Job<StrategyJobData>): Promise<string> {
    const { strategyId } = job.data;
    const strategy = await BacktestStrategy.findOneBy({ id: strategyId });
    if (!strategy) {
      throw new Error(`strategy ${strategyId} not found`);
    }
    return this.runStrategy(strategy, job);
  }

  async runStrategy(
    strategy: BacktestStrategy,
    job?: Job<StrategyJobData>,
  ): Promise<string> {
    const { algoCode, openAlgo, closeAlgo, openDealSide } = strategy;
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

    let runner: BaseBacktestRunner;
    switch (algoCode) {
      case StrategyAlgo.INT:
        runner = new IntegratedStrategyBacktest(
          strategy,
          this.klineDataService,
          jobEnv,
          logger,
        );
        break;
      default:
        throw new Error(`unknown strategy ${algoCode}`);
    }

    await wait(Math.round(10 * 1000 * Math.random()));

    return runner.run();
  }

  protected async doSummitJob(strategy: BacktestStrategy) {
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
        jobId: this.genJobId(strategy),
        attempts: 10,
        backoff: MINUTE_MS,
      },
    );
  }

  protected genJobId(s: BacktestStrategy) {
    return `s${s.id}/${s.currentDealId}`;
  }

  async summitJob(strategyId: number, force?: boolean) {
    const strategy = await BacktestStrategy.findOneBy({ id: strategyId });
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
    const strategies = await BacktestStrategy.findBy({
      active: true,
      jobSummited: Or(IsNull(), Equal(false)),
    });
    for (const strategy of strategies) {
      await this.doSummitJob(strategy);
      await BacktestStrategy.update(strategy.id, { jobSummited: true });
    }
  }

  async operateJob(
    strategyId: number,
    op: 'summit' | 'remove' | 'stop' | 'retry' | 'clearLogs',
  ): Promise<ApiResult> {
    const strategy = await BacktestStrategy.findOneBy({ id: strategyId });
    if (!strategy) {
      return ApiResult.fail(`strategy ${strategyId} not found`);
    }
    const { algoCode, openAlgo } = strategy;
    const qn = this.genStrategyQueueName(algoCode, openAlgo);
    const jobFacade = this.strategyJobFacades.get(qn);
    if (!jobFacade) {
      throw new Error(`jobFacade ${strategy.algoCode} not found`);
    }
    if (op === 'summit') {
      strategy.active = true;
      strategy.jobSummited = true;
      await strategy.save();
      await this.doSummitJob(strategy);
      return ApiResult.success();
    }
    const queue = jobFacade.getQueue();
    if (!strategy.currentDealId) {
      if (op === 'remove') {
        strategy.active = false;
        strategy.jobSummited = false;
        await strategy.save();
        return ApiResult.success();
      }
      return ApiResult.fail('not started');
    }
    const job = await queue.getJob(this.genJobId(strategy));
    if (!job) {
      return ApiResult.fail('no job');
    }

    if (op === 'clearLogs') {
      await job.clearLogs(30);
      return ApiResult.success();
    }
    if (op === 'stop') {
      job.discard();
      strategy.active = false;
      await strategy.save();
      return ApiResult.success();
    }
    if (op === 'remove') {
      strategy.active = false;
      strategy.jobSummited = false;
      await strategy.save();
      await job.remove();
      return ApiResult.success();
    }
    if (op === 'retry') {
      await BacktestDeal.delete({ strategyId: strategy.id });
      await BacktestOrder.delete({ strategyId: strategy.id });
      strategy.currentDealId = undefined;
      await strategy.save();
      await job.clearLogs(30);
      const state = await job.getState();
      this.logger.log(`job state: ${state}`);
      if (state === 'completed' || state === 'failed') {
        await job.retry(state);
      }
      return ApiResult.success();
    }
    return ApiResult.fail(`unknown operation ${op}`);
  }

  async removeAllJobs() {
    this.logger.log(`remove all jobs ...`);
    for (const s of this.strategyJobFacades.values()) {
      const q = s.getQueue();
      await q.drain(); // wait, delayed
      // 'completed' | 'wait' | 'active' | 'paused' | 'prioritized' | 'delayed' | 'failed'
      for (const type of ['completed', 'failed', 'active', 'delayed']) {
        await q.clean(1000, 1000, type as any);
      }
    }
  }

  async cloneStrategy(
    strategyId: number,
    memo?: string,
  ): Promise<ValueResult<BacktestStrategy>> {
    const strategy = await BacktestStrategy.findOneBy({ id: strategyId });
    if (!strategy) {
      return ApiResult.fail(`strategy ${strategyId} not found`);
    }
    const newStrategy = new BacktestStrategy();
    Object.assign(newStrategy, strategy);
    delete newStrategy.id;
    delete newStrategy.createdAt;
    delete newStrategy.currentDealId;
    newStrategy.memo = memo;
    newStrategy.jobSummited = false;
    await newStrategy.save();
    return ValueResult.value(newStrategy);
  }

  async dropStrategy(strategyId: number): Promise<ApiResult> {
    const strategy = await BacktestStrategy.findOneBy({ id: strategyId });
    if (!strategy) {
      return ApiResult.fail(`strategy ${strategyId} not found`);
    }
    await BacktestDeal.delete({ strategyId });
    await BacktestOrder.delete({ strategyId });
    await strategy.remove();

    return ApiResult.success();
  }
}
