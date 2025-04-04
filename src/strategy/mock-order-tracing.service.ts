import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import * as Rx from 'rxjs';
import { ExOrder, OrderStatus } from '@/db/models/ex-order';
import { Strategy } from '@/db/models/strategy/strategy';
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
  OppCheckerAlgo,
  StrategyAlgo,
  TraceOrderJobData,
} from '@/strategy/strategy.types';
import { fillOrderSize, newOrderId } from '@/strategy/strategy.utils';
import {
  IntenseWatchExitThreshold,
  IntenseWatchThreshold,
  ReportStatusInterval,
  WorkerMaxStalledCount,
  WorkerConcurrency,
  WorkerStalledInterval,
} from '@/strategy/strategy.constants';

@Injectable()
export class MockOrderTracingService implements OnModuleInit {
  protected traceOrderJobFacades = new Map<
    string,
    JobFacade<TraceOrderJobData, ExOrder>
  >();

  constructor(
    protected publicDataService: ExPublicDataService,
    protected publicWsService: ExPublicWsService,
    protected jobsService: JobsService,
    protected logger: AppLogger,
  ) {
    logger.setContext(`paper-trade order-tracing`);
  }

  onModuleInit(): any {
    setInterval(() => {
      this.clearJobLogs().catch((e) => this.logger.error(e, e.stack));
    }, HOUR_MS);
  }

  defineJobs() {
    this.logger.log(`:::: define jobs ...`);

    for (const code of Object.values(StrategyAlgo)) {
      for (const oca of Object.values(OppCheckerAlgo)) {
        const queueName = this.genOrderTracingQueueName(code, oca);
        const facade = this.jobsService.defineJob<TraceOrderJobData, any>({
          queueName,
          processJob: this.traceAndFillOrderJob.bind(this),
          workerOptions: {
            maxStalledCount: WorkerMaxStalledCount,
            stalledInterval: WorkerStalledInterval,
            concurrency: WorkerConcurrency,
          },
        });
        this.traceOrderJobFacades.set(queueName, facade);
      }
    }
  }

  private genOrderTracingQueueName(
    code: StrategyAlgo,
    oca: OppCheckerAlgo,
  ): string {
    return `paper-trade-order/${oca}`;
  }

  async traceAndFillOrderJob(
    job: Job<TraceOrderJobData>,
  ): Promise<ExOrder | undefined> {
    const { orderId } = job.data;
    const order = await ExOrder.findOneBy({ id: orderId });
    if (!order) {
      throw new Error(`orderId ${orderId} not found`);
    }
    return this.traceAndFillOrder(order, job);
  }

  async traceAndFillOrder(
    order: ExOrder,
    job?: Job<TraceOrderJobData>,
  ): Promise<ExOrder | undefined> {
    // const strategy = await Strategy.findOneBy({ id: strategyId });
    const tradeSide = order.side as TradeSide;
    await this.logJob(job, order, `start tracing ...`);

    const cancelCallback = async () => {
      const order2 = await ExOrder.findOne({
        select: ['id', 'status'],
        where: { id: order.id },
      });
      if (!order2) {
        return true;
      }
      return !ExOrder.orderToWait(order2.status);
    };

    if (await cancelCallback()) {
      await this.logJob(job, order, `cancel ...`);
      return undefined;
    }

    if (!order.tpslType) {
      const price = order.limitPrice;
      if (!price) {
        return undefined;
      }
      const hitPrice = await this.waitForPrice(
        job,
        order,
        price,
        tradeSide === 'buy' ? 'down' : 'up',
        cancelCallback,
      );
      if (!hitPrice) {
        return undefined;
      }
      // fill
      fillOrderSize(order, order);
      order.status = OrderStatus.filled;
      if (!order.exOrderId) {
        order.exOrderId = newOrderId({ id: order.strategyId, ex: order.ex });
      }
      if (!order.exCreatedAt) {
        order.exCreatedAt = new Date();
      }
      order.exUpdatedAt = new Date();
      await order.save();
      return order;
    }
    if (order.algoOrder) {
      let hitPrice: number;
      let trigger: string;
      if (order.tpslType === 'tp') {
        hitPrice = await this.waitTp(job, order, cancelCallback);
      } else if (order.tpslType === 'sl') {
        hitPrice = await this.waitSl(job, order, cancelCallback);
      } else if (order.tpslType === 'tpsl') {
        [hitPrice, trigger] = (await Promise.race([
          this.waitTp(job, order, cancelCallback).then((p) => [p, 'tp']),
          this.waitSl(job, order, cancelCallback).then((p) => [p, 'sl']),
        ])) as [number, string];
        // TODO:
      } else if (order.tpslType === 'move') {
        const { moveDrawbackPercent, moveActivePrice } = order;
        const activePrice = moveActivePrice || undefined;
        hitPrice = await this.traceMovingTpsl(
          job,
          order,
          tradeSide,
          moveDrawbackPercent,
          activePrice,
          cancelCallback,
        );
      }
      if (hitPrice) {
        // fill
        fillOrderSize(order, order, hitPrice);
        order.status = OrderStatus.filled;
        if (!order.exOrderId) {
          order.exOrderId = newOrderId({ id: order.strategyId, ex: order.ex });
        }
        if (!order.exCreatedAt) {
          order.exCreatedAt = new Date();
        }
        order.exUpdatedAt = new Date();
        await order.save();
        return order;
      }
      return undefined;
    }
    // attach order TODO:
    // let hitPrice: number;
    // let trigger: string;
    // if (order.tpslType === 'tp') {
    //   hitPrice = await this.waitTp(order, cancelCallback);
    // } else if (order.tpslType === 'sl') {
    //   hitPrice = await this.waitTp(order, cancelCallback);
    // } else if (order.tpslType === 'tpsl') {
    //   [hitPrice, trigger] = (await Promise.race([
    //     this.waitTp(order, cancelCallback).then((p) => [p, 'tp']),
    //     this.waitSl(order, cancelCallback).then((p) => [p, 'sl']),
    //   ])) as [number, string];
    // }
    // tpslClientOrderId
    return undefined;
  }

  async addOrderTracingJob(order: ExOrder): Promise<void> {
    const strategy = await Strategy.findOne({
      select: ['id', 'algoCode', 'openAlgo'],
      where: { id: order.strategyId },
    });
    const queueName = this.genOrderTracingQueueName(
      strategy.algoCode,
      strategy.openAlgo,
    );
    const jobFacade = this.traceOrderJobFacades.get(queueName);
    if (!jobFacade) {
      throw new Error(`jobFacade ${queueName} not found`);
    }
    await jobFacade.addTask(
      {
        orderId: order.id,
      },
      {
        jobId: `o/${order.clientOrderId}`,
        attempts: 10,
        backoff: MINUTE_MS,
      },
    );
  }

  async traceMovingTpsl(
    job: Job<TraceOrderJobData>,
    order: ExOrder,
    side: TradeSide,
    drawbackPercent: number,
    activePrice: number | undefined,
    cancelCallback?: () => Promise<boolean>,
  ): Promise<number | undefined> {
    const { ex, symbol } = order;
    const direction = side === 'buy' ? 'down' : 'up';
    if (activePrice) {
      activePrice = await this.waitForPrice(
        job,
        order,
        activePrice,
        direction,
        cancelCallback,
      );
      if (!activePrice) {
        return undefined;
      }
    } else {
      activePrice = await this.publicDataService.getLastPrice(ex, symbol);
    }
    const { obs, unsubs } = await this.publicWsService.subscribeRtPrice(
      ex,
      symbol,
    );
    const drawbackRatio = drawbackPercent / 100;
    const spr = 1 + drawbackRatio;
    const bpr = 1 - drawbackRatio;
    let price;
    let sentinel = activePrice;
    let orderPrice: number | undefined = undefined;
    let ri = 0;

    const reportStatusHandler = setInterval(async () => {
      if (!orderPrice) {
        return;
      }
      const diffPercent = evalDiffPercent(price, orderPrice);
      const pop = orderPrice.toPrecision(6);
      ri++;
      await this.logJob(
        job,
        order,
        `${sentinel} ~ ${price} ~ ${pop}, ${diffPercent.toFixed(4)}%, #${ri}`,
        `subs-RtPrice`,
      ).catch((e) => this.logger.error(e));
    }, ReportStatusInterval);

    const obs1 = obs.pipe(
      Rx.filter((rtPrice) => {
        price = rtPrice.price;
        if (side === TradeSide.buy) {
          if (sentinel > price) {
            sentinel = price;
            orderPrice = sentinel * spr;
          } else if (price >= orderPrice) {
            return true;
          }
        } else {
          if (sentinel < price) {
            sentinel = price;
            orderPrice = sentinel * bpr;
          } else if (price <= orderPrice) {
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
      order,
      `reach: ${orderPrice.toPrecision(6)}`,
      `subs-RtPrice`,
    );

    return orderPrice;
  }

  protected async logJob(
    job: Job<TraceOrderJobData> | undefined,
    order: ExOrder,
    message: string,
    context?: string,
  ): Promise<void> {
    if (context) {
      message = `${context}: ${message}`;
    }
    const { id, side } = order;
    const mc = `trace order: ${id}, ${side}`;
    this.logger.log(message, mc);
    if (job) {
      await job
        .log(`${new Date().toISOString()} ${message}`)
        .catch((err: Error) => {
          this.logger.error(err);
        });
    }
  }

  protected async waitForPrice(
    job: Job<TraceOrderJobData>,
    order: ExOrder,
    targetPrice: number,
    direction: 'up' | 'down',
    cancelCallback?: () => Promise<boolean>,
  ): Promise<number | undefined> {
    const { ex, symbol } = order;
    const tps = targetPrice.toPrecision(6);
    let ri = 0;
    const reportStatusHandler = setInterval(async () => {
      ri++;
      await this.logJob(
        job,
        order,
        `${direction} -> ${tps}, #${ri}`,
        `waitForPrice`,
      ).catch((e) => this.logger.error(e));
    }, ReportStatusInterval);

    try {
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
          await this.logJob(job, order, `${diffInfo}, watch`, logContext);
          watchRtPriceParams.timeoutSeconds = 10 * 60;
          const watchResult = await this.publicWsService.watchRtPrice(
            ex,
            symbol,
            watchRtPriceParams,
          );
          if (watchResult.timeout) {
            await this.logJob(job, order, `watchRtPrice timeout`, logContext);
            continue;
          }
          if (direction === 'down') {
            if (watchResult.reachLower) {
              return watchResult.price;
            }
          } else {
            if (watchResult.reachUpper) {
              return watchResult.price;
            }
          }
        } else if (diffPercentAbs < 1) {
          await this.logJob(job, order, `${diffInfo}, wait 10s`, logContext);
          await wait(10 * 1000);
        } else if (diffPercentAbs < 2) {
          await this.logJob(job, order, `${diffInfo}, wait 1m`, logContext);
          await wait(MINUTE_MS);
        } else if (diffPercentAbs < 5) {
          await this.logJob(job, order, `${diffInfo}, wait 5m`, logContext);
          await wait(5 * MINUTE_MS);
        } else if (diffPercentAbs < 10) {
          await this.logJob(job, order, `${diffInfo}, wait 30m`, logContext);
          await wait(30 * MINUTE_MS);
        } else {
          await this.logJob(job, order, `${diffInfo}, wait 2h`, logContext);
          await wait(2 * HOUR_MS);
        }

        const cancel = await cancelCallback();
        if (cancel) {
          await this.logJob(
            job,
            order,
            `exit due to cancel callback`,
            logContext,
          );
          return undefined;
        }
      }
    } finally {
      clearInterval(reportStatusHandler);
    }
  }

  protected async waitTp(
    job,
    order: ExOrder,
    cancelCallback?: () => Promise<boolean>,
  ): Promise<number | undefined> {
    const direction = order.side === 'buy' ? 'up' : 'down';
    if (order.tpTriggerPrice) {
      const tp = await this.waitForPrice(
        job,
        order,
        order.tpTriggerPrice,
        direction,
        cancelCallback,
      );
      if (!tp) {
        return undefined;
      }
    }
    return this.waitForPrice(
      job,
      order,
      order.tpOrderPrice,
      direction,
      cancelCallback,
    );
  }

  protected async waitSl(
    job,
    order: ExOrder,
    cancelCallback?: () => Promise<boolean>,
  ): Promise<number | undefined> {
    const direction = order.side === 'buy' ? 'down' : 'up';
    if (order.slTriggerPrice) {
      const tp = await this.waitForPrice(
        job,
        order,
        order.slTriggerPrice,
        direction,
        cancelCallback,
      );
      if (!tp) {
        return undefined;
      }
    }
    return this.waitForPrice(
      job,
      order,
      order.slOrderPrice,
      direction,
      cancelCallback,
    );
  }

  protected async clearJobLogs() {
    for (const jf of this.traceOrderJobFacades.values()) {
      const js = await jf.getQueue().getJobs('active');
      for (const job of js) {
        await job.clearLogs(100);
      }
    }
  }

  async clearCompletedJobs() {
    for (const jf of this.traceOrderJobFacades.values()) {
      const queue = jf.getQueue();
      await queue.clean(MINUTE_MS, 1000, 'completed');
    }
  }

  async clearFailedJobs() {
    for (const jf of this.traceOrderJobFacades.values()) {
      const queue = jf.getQueue();
      await queue.clean(MINUTE_MS, 1000, 'failed');
    }
  }
}
