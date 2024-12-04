import {
  CheckOpportunityParams,
  OppCheckerAlgo,
} from '@/trade-strategy/strategy.types';
import { StrategyJobEnv } from '@/trade-strategy/env/strategy-env';
import { AppLogger } from '@/common/app-logger';
import { BacktestStrategy } from '@/db/models/backtest-strategy';
import { KlineDataService } from '@/data-service/kline-data.service';
import { RuntimeParamsBacktest } from '@/trade-strategy/backtest/runner/runtime-params-backtest';
import { BacktestOrder } from '@/db/models/backtest-order';
import { BacktestKlineLevelsData } from '@/trade-strategy/backtest/backtest-kline-levels-data';
import { TimeLevel } from '@/db/models/time-level';
import { BacktestTradeOppo } from '@/trade-strategy/backtest/runner/base-backtest-runner';
import { BacktestKlineData } from '@/trade-strategy/backtest/backtest-kline-data';
import { checkBurstContinuous } from '@/trade-strategy/backtest/opportunity/burst';
import { ExOrderResp, OrderStatus, OrderTag } from '@/db/models/ex-order';
import { fillOrderSize } from '@/trade-strategy/strategy.utils';
import { evalTargetPrice } from '@/trade-strategy/opportunity/helper';
import { TradeSide } from '@/data-service/models/base';
import { checkLongStillContinuous } from '@/trade-strategy/backtest/opportunity/long-still';
import { checkJumpContinuous } from '@/trade-strategy/backtest/opportunity/jump';

export class IntegratedStrategyBacktest extends RuntimeParamsBacktest<CheckOpportunityParams> {
  constructor(
    protected strategy: BacktestStrategy,
    protected klineDataService: KlineDataService,
    protected jobEnv: StrategyJobEnv,
    protected logger: AppLogger,
  ) {
    super(strategy, klineDataService, jobEnv, logger);
  }

  protected async backtest(): Promise<void> {
    const strategy = this.strategy;

    const kld = this.klineData;
    let ol = 0;

    while (true) {
      ol++;
      await this.logJob(`round #${ol}`);
      const currentDeal = strategy.currentDeal;
      const pendingOrder = currentDeal.pendingOrder;
      const lastOrder = currentDeal?.lastOrder;

      if (pendingOrder) {
        const moveOn = await this.checkPendingOrderAndFill(kld, pendingOrder);
        if (!moveOn) {
          break;
        }
      } else {
        let tsTo: number = undefined;
        const rps = this.getRuntimeParams();
        if (lastOrder?.exUpdatedAt) {
          const lastOrderTs = lastOrder.exUpdatedAt.getTime();
          if (rps.minCloseInterval) {
            const seconds = TimeLevel.evalIntervalSeconds(rps.minCloseInterval);
            const minCloseTs = lastOrderTs + seconds * 1000;
            kld.moveOnTime(minCloseTs);
          }
          if (rps.maxCloseInterval) {
            const seconds = TimeLevel.evalIntervalSeconds(rps.maxCloseInterval);
            tsTo = lastOrderTs + seconds * 1000;
          }
          if (rps.stopLoss?.priceDiffPercent) {
            return Promise.race([
              // this.checkAndWaitToStopLoss(),
              // this.checkAndWaitToCloseDeal(),
            ]);
          } else {
            // return this.checkAndWaitToCloseDeal();
          }
        }
        const moveOn = await this.checkAndPlaceOrder(kld, tsTo);
        if (!moveOn) {
          break;
        }
      }
    }
  }

  protected async checkAndPlaceOrder(
    kld: BacktestKlineLevelsData,
    tsTo?: number,
  ): Promise<boolean> {
    const strategy = this.strategy;
    const currentDeal = strategy.currentDeal;
    const lastOrder = currentDeal?.lastOrder;
    const orderTag = lastOrder ? OrderTag.open : OrderTag.close;
    const side = lastOrder
      ? this.inverseSide(lastOrder.side)
      : strategy.openDealSide;
    const params = lastOrder
      ? this.getCloseRuntimeParams()
      : this.getOpenRuntimeParams();
    // const rps = this.getRuntimeParams();

    const checkOptions = {
      kld,
      considerSide: side,
      orderTag,
      tsTo,
    };
    let oppo: BacktestTradeOppo;
    switch (params.algo) {
      case OppCheckerAlgo.BR:
        const ckld = new BacktestKlineData(
          this.klineDataService,
          strategy.ex,
          params.baselineSymbol || 'BTC/USDT',
          TimeLevel.TL1mTo1d.find((tl) => tl.interval === params.interval),
          this.klineData.getCurrentTime(params.interval),
        );
        oppo = await checkBurstContinuous.call(
          this,
          params,
          ckld,
          checkOptions,
        );
        if (!oppo) {
          return false;
        }
        if (oppo.reachTimeLimit) {
          return true;
        }
        await this.placeOrder(oppo);
        return oppo.moveOn;
      case OppCheckerAlgo.LS:
        oppo = await checkLongStillContinuous.call(this, params, checkOptions);
        if (!oppo) {
          return false;
        }
        if (oppo.reachTimeLimit) {
          return true;
        }
        await this.placeOrder(oppo);
        return oppo.moveOn;
      case OppCheckerAlgo.JP:
        oppo = await checkJumpContinuous.call(this, params, checkOptions);
        if (!oppo) {
          return false;
        }
        if (oppo.reachTimeLimit) {
          return true;
        }
        await this.placeOrder(oppo);
        return oppo.moveOn;
      case OppCheckerAlgo.MV:
        break;
      case OppCheckerAlgo.FP:
        break;
      default:
        return undefined;
    }
    return true;
  }

  protected async checkPendingOrderAndFill(
    kld: BacktestKlineLevelsData,
    order: BacktestOrder,
  ): Promise<boolean> {
    if (!order.algoOrder) {
      const orderPrice = order.limitPrice!;
      const reachPrice = await this.moveOnToPrice(kld, orderPrice);
      if (!reachPrice) {
        return false;
      }
      const kl = await kld.getKline();

      await this.fillOrder(order, orderPrice, new Date(kld.getIntervalEndTs()));

      return kld.moveOrRollTime(false);
    } else {
      if (order.tpslType === 'move') {
        const { moveActivePrice, moveDrawbackPercent } = order;
        if (moveActivePrice) {
          const reachPrice = await this.moveOnToPrice(kld, moveActivePrice);
          if (!reachPrice) {
            return false;
          }
        }
        const kl = await kld.getKline();
        const activePrice = moveActivePrice || kl.close;

        const drawbackRatio = moveDrawbackPercent / 100;
        const spr = 1 + drawbackRatio;
        const bpr = 1 - drawbackRatio;
        let sentinel = activePrice;
        const isBuy = order.side === TradeSide.buy;
        let orderPrice = sentinel * (isBuy ? spr : bpr);

        while (true) {
          const kl = await kld.getKline();
          if (!kl) {
            const moved = kld.moveOrRollTime();
            if (moved) {
              continue;
            } else {
              return false;
            }
          }
          const tl = kld.getCurrentLevel();
          this.logger.log(`${tl.interval} ${kl.time.toISOString()} ${kl.open}`);

          let toFill = false;
          if (isBuy) {
            if (kl.low < sentinel) {
              sentinel = kl.low;
              orderPrice = sentinel * spr;
            } else if (kl.high >= orderPrice) {
              toFill = true;
            }
          } else {
            if (kl.high > sentinel) {
              sentinel = kl.high;
              orderPrice = sentinel * bpr;
            } else if (kl.low <= orderPrice) {
              toFill = true;
            }
          }
          if (toFill) {
            if (!kld.isLowestLevel()) {
              kld.moveDownLevel();
              continue;
            }
            await this.fillOrder(
              order,
              orderPrice,
              new Date(kld.getIntervalEndTs()),
            );
          }
          const moved = kld.moveOrRollTime(false);
          if (!moved) {
            return false;
          }
        }
      }
    }
    return true;
  }

  protected async fillOrder(
    order: BacktestOrder,
    orderPrice: number,
    orderTime: Date,
  ) {
    const exOrderId = this.newOrderId();
    const orderResp: ExOrderResp = {
      exOrderId,
      status: OrderStatus.filled,
      exUpdatedAt: orderTime,
      // rawOrder: {},
    };
    fillOrderSize(orderResp, order, orderPrice);

    await order.save();
    const currentDeal = this.strategy.currentDeal;
    currentDeal.lastOrder = order;
    currentDeal.lastOrderId = order.id;
    await currentDeal.save();
    await this.onOrderFilled();
  }

  protected async moveOnToPrice(kld: BacktestKlineLevelsData, price: number) {
    while (true) {
      const kl = await kld.getKline();
      if (!kl) {
        const moved = kld.moveOrRollTime();
        if (moved) {
          continue;
        } else {
          return false;
        }
      }
      const tl = kld.getCurrentLevel();
      this.logger.log(`${tl.interval} ${kl.time.toISOString()} ${kl.open}`);

      if (price >= kl.low && price <= kl.high) {
        if (kld.moveDownLevel()) {
          continue;
        }
        return true;
      }
      const moved = kld.moveOrRollTime(false);
      if (!moved) {
        return false;
      }
    }
  }

  protected newOrderId() {
    const { id, ex } = this.strategy;
    return `${ex.toLowerCase()}${id}${Math.round(Date.now() / 1000) - 1e9}bt`;
  }

  protected async placeOrder(oppo: BacktestTradeOppo): Promise<void> {
    const { order } = oppo;
    if (!order) {
      return;
    }
    const currentDeal = this.strategy.currentDeal;
    const exOrderId = this.newOrderId();
    if (order.priceType === 'market') {
      const orderResp: ExOrderResp = {
        exOrderId,
        status: OrderStatus.filled,
        exCreatedAt: oppo.orderTime,
        exUpdatedAt: oppo.orderTime,
        rawOrder: {},
      };
      fillOrderSize(orderResp, order, oppo.orderPrice);
      await order.save();
      currentDeal.lastOrder = order;
      currentDeal.lastOrderId = order.id;
      await currentDeal.save();
      await this.onOrderFilled();
    } else {
      await order.save();
      currentDeal.pendingOrder = order;
      currentDeal.pendingOrderId = order.id;
      await currentDeal.save();
    }
    // ...
  }
}
