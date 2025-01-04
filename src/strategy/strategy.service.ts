import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { Equal, In, IsNull, Or } from 'typeorm';
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
import { ApiResult, ValueResult } from '@/common/api-result';
import { BacktestDeal } from '@/db/models/strategy/backtest-deal';
import { BacktestOrder } from '@/db/models/strategy/backtest-order';

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

  protected defineJobs(type: 'paper-trade' | 'real-trade') {
    for (const code of Object.values(StrategyAlgo)) {
      for (const oca of Object.values(OppCheckerAlgo)) {
        const queueName = this.genStrategyQueueName(code, oca, type);
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

  defineRealTradeJobs() {
    this.logger.log(`:::: define real-trade jobs ...`);

    this.defineJobs('real-trade');
  }

  definePaperTradeJobs() {
    this.logger.log(`:::: define paper-trade jobs ...`);

    this.defineJobs('paper-trade');

    this.mockOrderTracingService.defineJobs();
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

  private genStrategyQueueName(
    code: StrategyAlgo,
    oca: OppCheckerAlgo,
    type = 'strategy',
  ): string {
    return `${type}/${oca}`;
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
    const { algoCode, openAlgo, closeAlgo, openDealSide, paperTrade } =
      strategy;
    const env = this.prepareEnv(strategy, job);
    const type = paperTrade ? 'paper-trade' : 'real-trade';
    const qn = this.genStrategyQueueName(algoCode, openAlgo, type);
    const jobFacade = this.strategyJobFacades.get(qn);
    if (!jobFacade) {
      throw new Error(`jobFacade ${algoCode}/${openAlgo} not found`);
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

    await wait(Math.round(5 * 1000 * Math.random()));

    return runner.run();
  }

  protected async doSummitJob(strategy: Strategy) {
    const { algoCode, openAlgo, paperTrade } = strategy;
    const type = paperTrade ? 'paper-trade' : 'real-trade';
    const qn = this.genStrategyQueueName(algoCode, openAlgo, type);
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

  protected genJobId(s: Strategy) {
    return `s${s.id}/${s.currentDealId}`;
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
      const u = await Strategy.update(strategy.id, { jobSummited: true });
      // u = {
      //   generatedMaps: [],
      //   raw: [],
      //   affected: 1,
      // };
      this.logger.log(JSON.stringify(u, null, 2));
    }
  }

  async operateJob(
    strategyId: number,
    op: 'summit' | 'remove' | 'stop' | 'retry' | 'clearLogs',
  ): Promise<ApiResult> {
    const strategy = await Strategy.findOneBy({ id: strategyId });
    if (!strategy) {
      return ApiResult.fail(`strategy ${strategyId} not found`);
    }
    const { algoCode, openAlgo, paperTrade } = strategy;
    const type = paperTrade ? 'paper-trade' : 'real-trade';
    const qn = this.genStrategyQueueName(algoCode, openAlgo, type);
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
      await job.retry();
      return ApiResult.success();
    }
    return ApiResult.fail(`unknown operation ${op}`);
  }

  async cloneStrategy(
    strategyId: number,
    memo?: string,
  ): Promise<ValueResult<Strategy>> {
    const strategy = await Strategy.findOneBy({ id: strategyId });
    if (!strategy) {
      return ValueResult.fail(`strategy ${strategyId} not found`);
    }
    const newStrategy = new Strategy();
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
    const strategy = await Strategy.findOneBy({ id: strategyId });
    if (!strategy) {
      return ApiResult.fail(`strategy ${strategyId} not found`);
    }
    await BacktestDeal.delete({ strategyId });
    await BacktestOrder.delete({ strategyId });
    await strategy.remove();

    return ApiResult.success();
  }
}
