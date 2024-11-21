import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import * as Rx from 'rxjs';
import {
  PlaceOrderParams,
  PlaceTpslOrderParams,
} from '@/exchange/exchange-service-types';
import { ExOrder, ExOrderResp, OrderStatus } from '@/db/models/ex-order';
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

declare type StatusReporter = (
  status: string,
  subContext?: string,
) => Promise<void>;

export interface TraceOrderJobData {
  strategyId: number;
  params: PlaceOrderParams;
}

const intenseWatchThreshold = 0.3;
const intenseWatchExitThreshold = 0.1;

@Injectable()
export class MockOrderTracingService implements OnModuleInit {
  protected traceOrderJobFacade: JobFacade<TraceOrderJobData, ExOrder>;

  constructor(
    protected publicDataService: ExPublicDataService,
    protected publicWsService: ExPublicWsService,
    protected jobsService: JobsService,
    protected logger: AppLogger,
  ) {}

  onModuleInit(): any {
    this.traceOrderJobFacade = this.jobsService.defineJob({
      queueName: 'Trace Order',
      processJob: this.traceAndFillOrder.bind(this),
    });
  }

  async addOrderTracingJob(
    strategyId: number,
    params: PlaceOrderParams,
  ): Promise<void> {
    await this.traceOrderJobFacade.addTask({
      strategyId,
      params,
    });
  }

  protected async waitForPrice(
    strategy: Strategy,
    targetPrice: number,
    direction: 'up' | 'down',
    reportStatus: StatusReporter,
    cancelCallback?: () => Promise<boolean>,
  ): Promise<number | undefined> {
    const { ex, market, symbol, rawSymbol } = strategy;

    while (true) {
      const lastPrice = await this.publicDataService.getLastPrice(
        ex,
        market,
        rawSymbol,
      );
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

      const diffInfo = `(${lastPrice} -> ${targetPrice}, ${diffPercent}%)`;

      if (diffPercentAbs <= intenseWatchThreshold) {
        let watchRtPriceParams: WatchRtPriceParams;
        if (direction === 'down') {
          watchRtPriceParams = {
            lowerBound: targetPrice,
            upperBound: lastPrice * (1 + intenseWatchExitThreshold / 100),
          };
        } else {
          watchRtPriceParams = {
            lowerBound: lastPrice * (1 - intenseWatchExitThreshold / 100),
            upperBound: targetPrice,
          };
        }
        await reportStatus(`${diffInfo}, watch`, `wait-${direction}`);
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
        await reportStatus(`${diffInfo}, wait 10s`, `wait-${direction}`);
        await wait(10 * 1000);
      } else if (diffPercentAbs < 2) {
        await reportStatus(`${diffInfo}, wait 1m`, `wait-${direction}`);
        await wait(MINUTE_MS);
      } else if (diffPercentAbs < 5) {
        await reportStatus(`${diffInfo}, wait 5m`, `wait-${direction}`);
        await wait(5 * MINUTE_MS);
      } else if (diffPercentAbs < 10) {
        await reportStatus(`${diffInfo}, wait 30m`, `wait-${direction}`);
        await wait(30 * MINUTE_MS);
      } else {
        await reportStatus(`${diffInfo}, wait 2h`, `wait-${direction}`);
        await wait(2 * HOUR_MS);
      }

      const cancel = await cancelCallback();
      if (cancel) {
        await reportStatus(`exit due to cancel callback`, `wait-${direction}`);
        return undefined;
      }
    }
  }

  async traceMovingTpsl(
    strategy: Strategy,
    side: TradeSide,
    drawbackRatio: number,
    activePrice: number | undefined,
    reportStatus: StatusReporter,
    cancelCallback?: () => Promise<boolean>,
  ): Promise<number | undefined> {
    const { ex, market, symbol, rawSymbol } = strategy;
    const direction = side === 'buy' ? 'down' : 'up';
    if (activePrice) {
      activePrice = await this.waitForPrice(
        strategy,
        activePrice,
        direction,
        reportStatus,
        cancelCallback,
      );
    } else {
      activePrice = await this.publicDataService.getLastPrice(
        ex,
        market,
        rawSymbol,
      );
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
      await reportStatus(
        `${sentinel}(sentinel) ~ ${price} ~ ${placeOrderPrice}(place-order)`,
        'subscribeRtPrice',
      ).catch((e) => this.logger.error(e));
    }, 30 * 1000);

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

    await reportStatus(`reach: ${placeOrderPrice}`, 'subscribeRtPrice');

    return placeOrderPrice;
  }

  async traceAndFillOrder(
    job: Job<TraceOrderJobData>,
  ): Promise<ExOrder | undefined> {
    const { params, strategyId } = job.data;
    const strategy = await Strategy.findOneBy({ id: strategyId });
    const tradeSide = params.side as TradeSide;
    await job.log(`strategy: ${strategy.name} #${strategy.id}`);

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

    const reportStatusFn: (context: string) => StatusReporter = (
      context: string,
    ) => {
      return async (status: string, subContext?: string) => {
        const c = subContext ? `${context}/${subContext}` : context;
        await job.updateProgress({ [c]: status });
      };
    };

    if (!params.tpslType) {
      const price = +params.price;
      if (!price) {
        return undefined;
      }
      const hitPrice = await this.waitForPrice(
        strategy,
        price,
        tradeSide === 'buy' ? 'down' : 'up',
        reportStatusFn(`trace ${params.clientOrderId}`),
        cancelCallback,
      );
      if (hitPrice) {
        const order = await ExOrder.findOneBy({
          clientOrderId: params.clientOrderId,
          strategyId: strategy.id,
          paperTrade: true,
        });
        // fill
        this.fillSize(order, params);
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
        hitPrice = await this.waitTp(
          strategy,
          params,
          reportStatusFn(`tp`),
          cancelCallback,
        );
      } else if (params.tpslType === 'sl') {
        hitPrice = await this.waitSl(
          strategy,
          params,
          reportStatusFn(`sl`),
          cancelCallback,
        );
      } else if (params.tpslType === 'tpsl') {
        [hitPrice, trigger] = (await Promise.race([
          this.waitTp(
            strategy,
            params,
            reportStatusFn(`tp`),
            cancelCallback,
          ).then((p) => [p, 'tp']),
          this.waitSl(
            strategy,
            params,
            reportStatusFn(`sl`),
            cancelCallback,
          ).then((p) => [p, 'sl']),
        ])) as [number, string];
        // TODO:
      } else if (params.tpslType === 'move') {
        const { moveDrawbackRatio, moveActivePrice } =
          params as PlaceTpslOrderParams;
        const activePrice = moveActivePrice ? +moveActivePrice : undefined;
        hitPrice = await this.traceMovingTpsl(
          strategy,
          tradeSide,
          +moveDrawbackRatio,
          activePrice,
          reportStatusFn('move'),
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
        this.fillSize(order, params, hitPrice);
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

  protected async waitTp(
    strategy: Strategy,
    params: PlaceOrderParams,
    reportStatus: StatusReporter,
    cancelCallback?: () => Promise<boolean>,
  ): Promise<number | undefined> {
    const direction = params.side === 'buy' ? 'up' : 'down';
    if (params.tpTriggerPrice) {
      await this.waitForPrice(
        strategy,
        +params.tpTriggerPrice,
        direction,
        reportStatus,
        cancelCallback,
      );
    }
    return this.waitForPrice(
      strategy,
      +params.tpOrderPrice,
      direction,
      reportStatus,
      cancelCallback,
    );
  }

  protected async waitSl(
    strategy: Strategy,
    params: PlaceOrderParams,
    reportStatus: StatusReporter,
    cancelCallback?: () => Promise<boolean>,
  ): Promise<number | undefined> {
    const direction = params.side === 'buy' ? 'down' : 'up';
    if (params.slTriggerPrice) {
      await this.waitForPrice(
        strategy,
        +params.slTriggerPrice,
        direction,
        reportStatus,
        cancelCallback,
      );
    }
    return this.waitForPrice(
      strategy,
      +params.slOrderPrice,
      direction,
      reportStatus,
      cancelCallback,
    );
  }

  protected fillSize(
    order: ExOrderResp,
    params: PlaceOrderParams,
    price?: number,
  ) {
    price = price || +params.price;
    const execSize = params.baseSize
      ? +params.baseSize
      : +params.quoteAmount / price;
    const execAmount = params.quoteAmount
      ? +params.quoteAmount
      : +params.baseSize * price;
    order.execPrice = price;
    order.execSize = execSize;
    order.execAmount = execAmount;
  }
}
