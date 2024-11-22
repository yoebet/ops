import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { Equal, IsNull, Or } from 'typeorm';
import { Exchanges } from '@/exchange/exchanges';
import { AppLogger } from '@/common/app-logger';
import { ExPublicWsService } from '@/data-ex/ex-public-ws.service';
import { ExPrivateWsService } from '@/data-ex/ex-private-ws.service';
import { Strategy } from '@/db/models/strategy';
import { StrategyEnv } from '@/trade-strategy/env/strategy-env';
import { MoveTracing } from '@/trade-strategy/strategy/move-tracing';
import { ExPublicDataService } from '@/data-ex/ex-public-data.service';
import { ExOrderService } from '@/ex-sync/ex-order.service';
import { StrategyEnvTrade } from '@/trade-strategy/env/strategy-env-trade';
import { StrategyEnvMockTrade } from '@/trade-strategy/env/strategy-env-mock-trade';
import { JobFacade, JobsService } from '@/job/jobs.service';
import { MockOrderTracingService } from '@/trade-strategy/mock-order-tracing.service';
import { BaseRunner } from '@/trade-strategy/strategy/base-runner';
import {
  StrategyAlgo,
  StrategyJobData,
  StrategyWorkerMaxStalledCount,
  StrategyWorkerStalledInterval,
} from '@/trade-strategy/strategy.types';
import { BurstMonitor } from '@/trade-strategy/strategy/burst-monitor';

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
        queueName: this.genStrategyQueueName(code),
        processJob: this.runStrategyJob.bind(this),
        workerOptions: {
          maxStalledCount: StrategyWorkerMaxStalledCount,
          stalledInterval: StrategyWorkerStalledInterval,
          // skipStalledCheck: true,
          concurrency: 10,
        },
      });
      this.strategyJobFacades.set(code, facade);
    }
  }

  private genStrategyQueueName(code: StrategyAlgo): string {
    return `strategy/${code}`;
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
    let runner: BaseRunner;
    const logger = this.logger.subLogger(`${strategy.algoCode}/${strategy.id}`);
    if (strategy.algoCode === StrategyAlgo.MV) {
      runner = new MoveTracing(strategy, env, logger);
    } else if (strategy.algoCode === StrategyAlgo.BR) {
      runner = new BurstMonitor(strategy, env, logger);
    } else {
      throw new Error(`unknown strategy ${strategy.algoCode}`);
    }
    await runner.run().catch((err: Error) => {
      this.logger.error(err);
    });
  }

  async summitJob(strategyId: number) {
    const strategy = await Strategy.findOneBy({ id: strategyId });
    if (!strategy) {
      throw new Error(`strategy ${strategyId} not found`);
    }
    if (strategy.jobSummited) {
      this.logger.log(`strategy job summited`);
      return;
    }
    if (!strategy.active) {
      this.logger.log(`strategy job not active`);
      return;
    }
    const jobFacade = this.strategyJobFacades.get(strategy.algoCode);
    if (!jobFacade) {
      throw new Error(`jobFacade ${strategy.algoCode} not found`);
    }
    await jobFacade.addTask(
      { strategyId },
      {
        jobId: 's' + strategyId,
        attempts: 100,
      },
    );
    strategy.jobSummited = true;
    await strategy.save();
  }

  async summitAllJobs() {
    const strategies = await Strategy.find({
      select: ['id', 'algoCode'],
      where: { active: true, jobSummited: Or(IsNull(), Equal(false)) },
    });
    for (const strategy of strategies) {
      const jobFacade = this.strategyJobFacades.get(strategy.algoCode);
      if (!jobFacade) {
        throw new Error(`jobFacade ${strategy.algoCode} not found`);
      }
      await jobFacade.addTask(
        { strategyId: strategy.id },
        {
          jobId: 's' + strategy.id,
          attempts: 100,
        },
      );
      await Strategy.update(strategy.id, { jobSummited: true });
    }
  }
}
