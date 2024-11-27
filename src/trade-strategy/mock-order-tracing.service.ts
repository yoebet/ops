import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import * as Rx from 'rxjs';
import {
  PlaceOrderParams,
  PlaceTpslOrderParams,
} from '@/exchange/exchange-service.types';
import { ExOrder, OrderStatus } from '@/db/models/ex-order';
import { Strategy } from '@/db/models/strategy';
import {
  evalDiffPercent,
  HOUR_MS,
  MINUTE_MS,
  wait,
} from '@/common/utils/utils';
import { ExPublicDataService } from '@/data-ex/ex-public-data.service';
import {
  ExPublicWsService,
  WatchRtPriceParams,
} from '@/data-ex/ex-public-ws.service';
import { TradeSide } from '@/data-service/models/base';
import { AppLogger } from '@/common/app-logger';
import { JobFacade, JobsService } from '@/job/jobs.service';
import {
  StrategyAlgo,
  TraceOrderJobData,
} from '@/trade-strategy/strategy.types';
import { fillOrderSize } from '@/trade-strategy/strategy.utils';
import {
  IntenseWatchExitThreshold,
  IntenseWatchThreshold,
  ReportStatusInterval,
  WorkerMaxStalledCount,
  WorkerConcurrency,
  WorkerStalledInterval,
} from '@/trade-strategy/strategy.constants';

@Injectable()
export class MockOrderTracingService implements OnModuleInit {
  protected traceOrderJobFacades = new Map<
    StrategyAlgo,
    JobFacade<TraceOrderJobData, ExOrder>
  >();

  constructor(
    protected publicDataService: ExPublicDataService,
    protected publicWsService: ExPublicWsService,
    protected jobsService: JobsService,
    protected logger: AppLogger,
  ) {}

  onModuleInit(): any {
    for (const code of Object.values(StrategyAlgo)) {
      const facade = this.jobsService.defineJob<TraceOrderJobData, any>({
        queueName: `trace-order/${code}`,
        processJob: this.traceAndFillOrder.bind(this),
        workerOptions: {
          maxStalledCount: WorkerMaxStalledCount,
          stalledInterval: WorkerStalledInterval,
          concurrency: WorkerConcurrency,
        },
      });
      this.traceOrderJobFacades.set(code, facade);
    }
  }

  async addOrderTracingJob(
    strategy: Strategy,
    params: PlaceOrderParams,
  ): Promise<void> {
    const strategyId = strategy.id;
    const jobFacade = this.traceOrderJobFacades.get(strategy.algoCode);
    if (!jobFacade) {
      throw new Error(`jobFacade ${strategy.algoCode} not found`);
    }
    await jobFacade.addTask(
      {
        strategyId,
        params,
      },
      {
        jobId: `o/${params.clientOrderId}`,
        attempts: 10,
        backoff: MINUTE_MS,
      },
    );
  }

  async traceMovingTpsl(
    job: Job<TraceOrderJobData>,
    strategy: Strategy,
    side: TradeSide,
    drawbackRatio: number,
    activePrice: number | undefined,
    cancelCallback?: () => Promise<boolean>,
  ): Promise<number | undefined> {
    const { ex, symbol } = strategy;
    const direction = side === 'buy' ? 'down' : 'up';
    if (activePrice) {
      activePrice = await this.waitForPrice(
        job,
        strategy,
        activePrice,
        direction,
        cancelCallback,
      );
    } else {
      activePrice = await this.publicDataService.getLastPrice(ex, symbol);
    }
    const { obs, unsubs } = await this.publicWsService.subscribeRtPrice(
      ex,
      symbol,
    );
    const spr = 1 + drawbackRatio;
    const bpr = 1 - drawbackRatio;
    let price;
    let sentinel = activePrice;
    let placeOrderPrice: number | undefined = undefined;

    const reportStatusHandler = setInterval(async () => {
      const diffPercent = evalDiffPercent(price, placeOrderPrice);
      const pop = placeOrderPrice.toPrecision(6);
      await this.logJob(
        job,
        `${sentinel} ~ ${price} ~ ${pop}, ${diffPercent.toFixed(4)}%`,
        `subs-RtPrice`,
      ).catch((e) => this.logger.error(e));
    }, ReportStatusInterval);

    const obs1 = obs.pipe(
      Rx.filter((rtPrice) => {
        price = rtPrice.price;
        if (side === TradeSide.buy) {
          if (price < sentinel) {
            sentinel = price;
            placeOrderPrice = sentinel * spr;
          } else if (price >= placeOrderPrice) {
            return true;
          }
        } else {
          if (price > sentinel) {
            sentinel = price;
            placeOrderPrice = sentinel * bpr;
          } else if (price <= placeOrderPrice) {
            return true;
          }
        }
        return false;
      }),
    );

    await Rx.firstValueFrom(obs1);
    unsubs();

    clearInterval(reportStatusHandler);

    await this.logJob(
      job,
      `reach: ${placeOrderPrice.toPrecision(6)}`,
      `subs-RtPrice`,
    );

    return placeOrderPrice;
  }

  protected async logJob(
    job: Job<TraceOrderJobData>,
    message: string,
    context?: string,
  ): Promise<void> {
    const { params, strategyId } = job.data;
    if (context) {
      message = `${context}: ${message}`;
    }
    const mc = `[strategy: ${strategyId}, order: ${params.clientOrderId}]`;
    this.logger.log(message, mc);
    message = `${mc} ${message}`;
    await job
      .log(`${new Date().toISOString()} ${message}`)
      .catch((err: Error) => {
        this.logger.error(err);
      });
  }

  async traceAndFillOrder(
    job: Job<TraceOrderJobData>,
  ): Promise<ExOrder | undefined> {
    const { params, strategyId } = job.data;
    const strategy = await Strategy.findOneBy({ id: strategyId });
    const tradeSide = params.side as TradeSide;
    await this.logJob(job, `start tracing ...`);

    const cancelCallback = async () => {
      const order = await ExOrder.findOne({
        select: ['id', 'status'],
        where: {
          clientOrderId: params.clientOrderId,
          strategyId: strategy.id,
          paperTrade: true,
        },
      });
      if (!order) {
        return true;
      }
      return !ExOrder.orderToWait(order.status);
    };

    // const reportStatusFn: (context: string) => StatusReporter = (
    //   context: string,
    // ) => {
    //   return async (status: string, subContext?: string) => {
    //     const c = subContext ? `${context}/${subContext}` : context;
    //     // await job.updateProgress({ [c]: status });
    //     const msg = `[${c}] ${status}`;
    //     this.logger.log(msg);
    //     await job.log(`${new Date().toISOString()} ${msg}`);
    //   };
    // };

    if (!(await cancelCallback())) {
      return undefined;
    }

    if (!params.tpslType) {
      const price = +params.price;
      if (!price) {
        return undefined;
      }
      const hitPrice = await this.waitForPrice(
        job,
        strategy,
        price,
        tradeSide === 'buy' ? 'down' : 'up',
        cancelCallback,
      );
      if (hitPrice) {
        const order = await ExOrder.findOneBy({
          clientOrderId: params.clientOrderId,
          strategyId: strategy.id,
          paperTrade: true,
        });
        // fill
        fillOrderSize(order, params);
        order.status = OrderStatus.filled;
        await order.save();
        return order;
      }
      return undefined;
    }
    if (params.algoOrder) {
      let hitPrice: number;
      let trigger: string;
      if (params.tpslType === 'tp') {
        hitPrice = await this.waitTp(job, strategy, params, cancelCallback);
      } else if (params.tpslType === 'sl') {
        hitPrice = await this.waitSl(job, strategy, params, cancelCallback);
      } else if (params.tpslType === 'tpsl') {
        [hitPrice, trigger] = (await Promise.race([
          this.waitTp(job, strategy, params, cancelCallback).then((p) => [
            p,
            'tp',
          ]),
          this.waitSl(job, strategy, params, cancelCallback).then((p) => [
            p,
            'sl',
          ]),
        ])) as [number, string];
        // TODO:
      } else if (params.tpslType === 'move') {
        const { moveDrawbackRatio, moveActivePrice } =
          params as PlaceTpslOrderParams;
        const activePrice = moveActivePrice ? +moveActivePrice : undefined;
        hitPrice = await this.traceMovingTpsl(
          job,
          strategy,
          tradeSide,
          +moveDrawbackRatio,
          activePrice,
          cancelCallback,
        );
      }
      if (hitPrice) {
        const order = await ExOrder.findOneBy({
          clientOrderId: params.clientOrderId,
          strategyId: strategy.id,
          paperTrade: true,
        });
        // fill
        fillOrderSize(order, params, hitPrice);
        order.status = OrderStatus.filled;
        await order.save();
        return order;
      }
      return undefined;
    }
    // attach order TODO:
    // let hitPrice: number;
    // let trigger: string;
    // if (params.tpslType === 'tp') {
    //   hitPrice = await this.waitTp(params, cancelCallback);
    // } else if (params.tpslType === 'sl') {
    //   hitPrice = await this.waitTp(params, cancelCallback);
    // } else if (params.tpslType === 'tpsl') {
    //   [hitPrice, trigger] = (await Promise.race([
    //     this.waitTp(params, cancelCallback).then((p) => [p, 'tp']),
    //     this.waitSl(params, cancelCallback).then((p) => [p, 'sl']),
    //   ])) as [number, string];
    // }
    // tpslClientOrderId
    return undefined;
  }

  protected async waitForPrice(
    job: Job<TraceOrderJobData>,
    strategy: Strategy,
    targetPrice: number,
    direction: 'up' | 'down',
    cancelCallback?: () => Promise<boolean>,
  ): Promise<number | undefined> {
    const { ex, symbol } = strategy;

    while (true) {
      const lastPrice = await this.publicDataService.getLastPrice(ex, symbol);
      if (direction === 'up') {
        if (lastPrice >= targetPrice) {
          return lastPrice;
        }
      }
      if (direction === 'down') {
        if (lastPrice <= targetPrice) {
          return lastPrice;
        }
      }

      const diffPercent = evalDiffPercent(lastPrice, targetPrice);
      const diffPercentAbs = Math.abs(diffPercent);

      const lps = lastPrice.toPrecision(6);
      const tps = targetPrice.toPrecision(6);
      const diffInfo = `(${lps} -> ${tps}, ${diffPercent.toFixed(4)}%)`;
      const logContext = `wait-${direction}`;

      if (diffPercentAbs <= IntenseWatchThreshold) {
        let watchRtPriceParams: WatchRtPriceParams;
        if (direction === 'down') {
          watchRtPriceParams = {
            lowerBound: targetPrice,
            upperBound: lastPrice * (1 + IntenseWatchExitThreshold / 100),
          };
        } else {
          watchRtPriceParams = {
            lowerBound: lastPrice * (1 - IntenseWatchExitThreshold / 100),
            upperBound: targetPrice,
          };
        }
        await this.logJob(job, `${diffInfo}, watch`, logContext);
        watchRtPriceParams.timeoutSeconds = 10 * 60;
        const watchResult = await this.publicWsService.watchRtPrice(
          ex,
          symbol,
          watchRtPriceParams,
        );
        if (watchResult.timeout) {
          continue;
        }
        if (direction === 'down') {
          if (watchResult.reachLower) {
            return watchResult.price;
          }
        } else {
          if (watchResult.reachLower) {
            return watchResult.price;
          }
        }
      } else if (diffPercentAbs < 1) {
        // await reportStatus(`${diffInfo}, wait 10s`, logContext);
        await wait(10 * 1000);
      } else if (diffPercentAbs < 2) {
        await this.logJob(job, `${diffInfo}, wait 1m`, logContext);
        await wait(MINUTE_MS);
      } else if (diffPercentAbs < 5) {
        await this.logJob(job, `${diffInfo}, wait 5m`, logContext);
        await wait(5 * MINUTE_MS);
      } else if (diffPercentAbs < 10) {
        await this.logJob(job, `${diffInfo}, wait 30m`, logContext);
        await wait(30 * MINUTE_MS);
      } else {
        await this.logJob(job, `${diffInfo}, wait 2h`, logContext);
        await wait(2 * HOUR_MS);
      }

      const cancel = await cancelCallback();
      if (cancel) {
        await this.logJob(job, `exit due to cancel callback`, logContext);
        return undefined;
      }
    }
  }

  protected async waitTp(
    job,
    strategy: Strategy,
    params: PlaceOrderParams,
    cancelCallback?: () => Promise<boolean>,
  ): Promise<number | undefined> {
    const direction = params.side === 'buy' ? 'up' : 'down';
    if (params.tpTriggerPrice) {
      await this.waitForPrice(
        job,
        strategy,
        +params.tpTriggerPrice,
        direction,
        cancelCallback,
      );
    }
    return this.waitForPrice(
      job,
      strategy,
      +params.tpOrderPrice,
      direction,
      cancelCallback,
    );
  }

  protected async waitSl(
    job,
    strategy: Strategy,
    params: PlaceOrderParams,
    cancelCallback?: () => Promise<boolean>,
  ): Promise<number | undefined> {
    const direction = params.side === 'buy' ? 'down' : 'up';
    if (params.slTriggerPrice) {
      await this.waitForPrice(
        job,
        strategy,
        +params.slTriggerPrice,
        direction,
        cancelCallback,
      );
    }
    return this.waitForPrice(
      job,
      strategy,
      +params.slOrderPrice,
      direction,
      cancelCallback,
    );
  }
}
