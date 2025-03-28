import {
  CheckOpportunityParams,
  OppCheckerAlgo,
} from '@/strategy/strategy.types';
import { StrategyJobEnv } from '@/strategy/env/strategy-env';
import { AppLogger } from '@/common/app-logger';
import { BacktestStrategy } from '@/db/models/strategy/backtest-strategy';
import { KlineDataService } from '@/data-service/kline-data.service';
import { RuntimeParamsBacktest } from '@/strategy-backtest/runner/runtime-params-backtest';
import { BacktestOrder } from '@/db/models/strategy/backtest-order';
import { BacktestKlineLevelsData } from '@/strategy-backtest/backtest-kline-levels-data';
import { TimeLevel } from '@/db/models/time-level';
import {
  BacktestTradeOppo,
  CheckOppoOptions,
} from '@/strategy-backtest/runner/base-backtest-runner';
import { BacktestKlineData } from '@/strategy-backtest/backtest-kline-data';
import { checkBurstContinuous } from '@/strategy-backtest/opportunity/burst';
import { OrderStatus, OrderTag } from '@/db/models/ex-order';
import { fillOrderSize } from '@/strategy/strategy.utils';
import { TradeSide } from '@/data-service/models/base';
import { checkLongStillContinuous } from '@/strategy-backtest/opportunity/long-still';
import { checkJumpContinuous } from '@/strategy-backtest/opportunity/jump';
import { checkMoveContinuous } from '@/strategy-backtest/opportunity/move';
import { checkLimitOrderContinuous } from '@/strategy-backtest/opportunity/tpsl';
import { DefaultBaselineSymbol } from '@/strategy/strategy.constants';
import { evalTargetPrice } from '@/strategy/opportunity/helper';
import { checkBollingerContinuous } from '@/strategy-backtest/opportunity/bollinger';
import { checkPressureContinuous } from '@/strategy-backtest/opportunity/pressure';
import { StrategyDeal } from '@/db/models/strategy/strategy-deal';

export class IntegratedStrategyBacktest extends RuntimeParamsBacktest<CheckOpportunityParams> {
  constructor(
    protected readonly strategy: BacktestStrategy,
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
      const startTs = kld.getCurrentTs();
      await this.loadOrCreateDeal(startTs);

      ol++;
      await this.logJob(`round #${ol}`);
      const currentDeal = strategy.currentDeal;
      const pendingOrder = currentDeal.pendingOrder;
      const lastOrder = currentDeal?.lastOrder;

      if (ol === 1 && currentDeal) {
        const dealOpenTs = currentDeal.openAt?.getTime();
        if (dealOpenTs && startTs < dealOpenTs) {
          kld.moveOnToTime(dealOpenTs);
          this.logger.log(`move to deal open: ${currentDeal.openAt}`);
        }
        if (lastOrder) {
          const lastOrderExUpdatedTs = lastOrder.exUpdatedAt?.getTime();
          if (lastOrderExUpdatedTs && startTs < lastOrderExUpdatedTs) {
            kld.moveOnToTime(lastOrderExUpdatedTs);
            this.logger.log(`move to last order: ${lastOrder.exUpdatedAt}`);
          }
        }
        if (pendingOrder) {
          const pendingOrderExCreatedTs = pendingOrder.exCreatedAt?.getTime();
          if (pendingOrderExCreatedTs && startTs < pendingOrderExCreatedTs) {
            kld.moveOnToTime(pendingOrderExCreatedTs);
            this.logger.log(
              `move to pending order: ${pendingOrder.exCreatedAt}`,
            );
          }
        }
      }

      if (pendingOrder) {
        const moveOn = await this.tryFillPendingOrder(kld, pendingOrder);
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
            kld.moveOnToTime(minCloseTs);
          }
          if (rps.maxCloseInterval) {
            const seconds = TimeLevel.evalIntervalSeconds(rps.maxCloseInterval);
            tsTo = lastOrderTs + seconds * 1000;
          }
        }
        // TODO: lossCoolDownInterval
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
    const orderTag = lastOrder ? OrderTag.close : OrderTag.open;
    const side = lastOrder
      ? this.inverseSide(lastOrder.side)
      : strategy.openDealSide;
    const params = lastOrder
      ? this.getCloseRuntimeParams()
      : this.getOpenRuntimeParams();

    const checkOptions: CheckOppoOptions = {
      kld,
      considerSide: side,
      tsTo,
    };
    const oppor: Partial<BacktestTradeOppo> = {
      orderTag,
    };
    if (lastOrder) {
      const stopLossPercent =
        this.getRuntimeParams().stopLoss?.priceDiffPercent;
      if (stopLossPercent) {
        checkOptions.stopLossPrice = evalTargetPrice(
          lastOrder.execPrice,
          stopLossPercent,
          lastOrder.side,
        );
        checkOptions.closeSide = this.inverseSide(lastOrder.side);
      }
      oppor.orderSize = lastOrder.execSize;
      oppor.orderAmount = lastOrder.execAmount;
    }
    let oppo: BacktestTradeOppo;
    switch (params.algo) {
      case OppCheckerAlgo.BR:
        const ckld = new BacktestKlineData(
          this.klineDataService,
          strategy.ex,
          params.baselineSymbol || DefaultBaselineSymbol,
          TimeLevel.TL1mTo1d.find((tl) => tl.interval === params.interval),
          this.klineData.getCurrentTime(params.interval),
        );
        oppo = await checkBurstContinuous.call(
          this,
          params,
          ckld,
          oppor,
          checkOptions,
        );
        break;
      case OppCheckerAlgo.LS:
        oppo = await checkLongStillContinuous.call(
          this,
          params,
          oppor,
          checkOptions,
        );
        break;
      case OppCheckerAlgo.JP:
        oppo = await checkJumpContinuous.call(
          this,
          params,
          oppor,
          checkOptions,
        );
        break;
      case OppCheckerAlgo.MV:
        oppo = await checkMoveContinuous.call(
          this,
          params,
          oppor,
          checkOptions,
        );
        break;
      case OppCheckerAlgo.TP:
        oppo = await checkLimitOrderContinuous.call(
          this,
          params,
          oppor,
          checkOptions,
        );
        break;
      case OppCheckerAlgo.BB:
        oppo = await checkBollingerContinuous.call(
          this,
          params,
          oppor,
          checkOptions,
        );
        break;
      case OppCheckerAlgo.PR:
        oppo = await checkPressureContinuous.call(
          this,
          params,
          oppor,
          checkOptions,
        );
        break;
      default:
        return undefined;
    }
    if (!oppo) {
      return false;
    }
    await this.placeOrder(oppo);
    if (oppo.moveOn === undefined) {
      return kld.moveOver();
    }
    return oppo.moveOn;
  }

  protected async tryFillPendingOrder(
    kld: BacktestKlineLevelsData,
    order: BacktestOrder,
  ): Promise<boolean> {
    if (!order.algoOrder) {
      const orderPrice = order.limitPrice!;
      if (order.cancelPrice) {
        const { reach, index } = await this.moveOnToPriceEitherSide(
          kld,
          order.cancelPrice,
          orderPrice,
        );
        if (!reach) {
          return false;
        }
        const orderTime = new Date(kld.getIntervalEndTs());
        if (index === 1) {
          await this.cancelOrder(order, orderTime);
        } else {
          await this.fillOrder(order, orderPrice, orderTime);
        }
      } else {
        const reachPrice = await this.moveOnToPrice(kld, orderPrice);
        if (!reachPrice) {
          return false;
        }
        // const kl = await kld.getKline();
        await this.fillOrder(
          order,
          orderPrice,
          new Date(kld.getIntervalEndTs()),
        );
      }

      return kld.moveOver();
    }

    if (order.tpslType === 'move') {
      const { moveActivePrice, moveDrawbackPercent } = order;
      if (moveActivePrice) {
        const reachPrice = await this.moveOnToPrice(kld, moveActivePrice);
        if (!reachPrice) {
          return false;
        }
      }
      const kl = await kld.getKline();
      if (!kl) {
        return undefined;
      }
      const activePrice = moveActivePrice || kl.open;

      const drawbackRatio = moveDrawbackPercent / 100;
      const spr = 1 + drawbackRatio;
      const bpr = 1 - drawbackRatio;
      let sentinel = activePrice;
      const isBuy = order.side === TradeSide.buy;
      let orderPrice = sentinel * (isBuy ? spr : bpr);

      while (true) {
        const kl = await kld.getKline();
        if (!kl) {
          const moved = kld.moveOn();
          if (moved) {
            continue;
          } else {
            return false;
          }
        }
        // const tl = kld.getCurrentLevel();
        // this.logger.debug(
        //   `${tl.interval} ${kl.time.toISOString()} ${kl.open}`,
        // );

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
          if (kld.moveDownLevel()) {
            continue;
          }
          const memo = `active: ${activePrice.toPrecision(6)}, sentinel: ${sentinel.toPrecision(6)}`;
          if (order.memo) {
            order.memo = [order.memo, memo].join('\n');
          } else {
            order.memo = memo;
          }
          await this.fillOrder(
            order,
            orderPrice,
            new Date(kld.getIntervalEndTs()),
          );
          return kld.moveOver();
        }
        const moved = kld.moveOver();
        if (!moved) {
          return false;
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
    fillOrderSize(order, order, orderPrice);
    order.exOrderId = this.newOrderId();
    order.status = OrderStatus.filled;
    if (!order.exCreatedAt) {
      order.exCreatedAt = orderTime;
    }
    order.exUpdatedAt = orderTime;

    await order.save();
    const currentDeal = this.strategy.currentDeal;
    StrategyDeal.setLastOrder(currentDeal, order);
    StrategyDeal.setPendingOrder(currentDeal, null);
    await currentDeal.save();
    await this.onOrderFilled();

    await this.logJob(`order filled: ${order.side} @ ${order.execPrice}`);
  }

  protected async cancelOrder(order: BacktestOrder, orderTime: Date) {
    order.exOrderId = this.newOrderId();
    order.status = OrderStatus.canceled;
    if (!order.exCreatedAt) {
      order.exCreatedAt = orderTime;
    }
    order.exUpdatedAt = orderTime;

    await order.save();
    const currentDeal = this.strategy.currentDeal;
    StrategyDeal.setPendingOrder(currentDeal, null);
    await currentDeal.save();

    await this.logJob(`order canceled: ${order.side}`);
  }

  protected async moveOnToPrice(kld: BacktestKlineLevelsData, price: number) {
    while (true) {
      const kl = await kld.getKline();
      if (!kl) {
        const moved = kld.moveOn();
        if (moved) {
          continue;
        } else {
          return false;
        }
      }
      // const tl = kld.getCurrentLevel();
      // this.logger.debug(`${tl.interval} ${kl.time.toISOString()} ${kl.open}`);

      if (price >= kl.low && price <= kl.high) {
        if (kld.moveDownLevel()) {
          continue;
        }
        return true;
      }
      const moved = kld.moveOver();
      if (!moved) {
        return false;
      }
    }
  }

  protected async moveOnToPriceEitherSide(
    kld: BacktestKlineLevelsData,
    price1: number,
    price2: number,
  ): Promise<{ reach: boolean; index?: 1 | 2 }> {
    while (true) {
      const kl = await kld.getKline();
      if (!kl) {
        const moved = kld.moveOn();
        if (moved) {
          continue;
        } else {
          return { reach: false };
        }
      }
      if (
        (price1 >= kl.low && price1 <= kl.high) ||
        (price2 >= kl.low && price2 <= kl.high)
      ) {
        if (kld.moveDownLevel()) {
          continue;
        }
        return {
          reach: true,
          index: price1 >= kl.low && price1 <= kl.high ? 1 : 2,
        };
      }
      const moved = kld.moveOver();
      if (!moved) {
        return { reach: false };
      }
    }
  }

  protected newOrderId() {
    const { id } = this.strategy;
    return `bt${id}${Date.now()}`;
  }

  protected async placeOrder(oppo: BacktestTradeOppo): Promise<void> {
    const { order, orderSize, orderAmount, orderPrice, orderTime } = oppo;
    if (!order) {
      return;
    }
    const strategy = this.strategy;
    const currentDeal = strategy.currentDeal;
    order.exOrderId = this.newOrderId();
    order.exCreatedAt = orderTime;
    order.exUpdatedAt = orderTime;
    if (order.side === TradeSide.buy) {
      if (!order.quoteAmount) {
        order.quoteAmount = orderAmount || strategy.quoteAmount;
      }
    } else {
      if (!order.baseSize && orderSize) {
        order.baseSize = orderSize;
      }
      if (!order.baseSize) {
        const amount = orderAmount || strategy.quoteAmount;
        order.baseSize = amount / orderPrice;
      }
    }
    if (order.priceType === 'market') {
      fillOrderSize(order, order, orderPrice);
      order.status = OrderStatus.filled;
      await order.save();
      StrategyDeal.setLastOrder(currentDeal, order);
      await currentDeal.save();
      await this.onOrderFilled();
    } else {
      order.status = OrderStatus.pending;
      await order.save();
      StrategyDeal.setPendingOrder(currentDeal, order);
      await currentDeal.save();
    }
  }
}
