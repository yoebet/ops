import * as _ from 'lodash';
import { Strategy } from '@/db/models/strategy';
import { AppLogger } from '@/common/app-logger';
import { StrategyDeal } from '@/db/models/strategy-deal';
import { TradeSide } from '@/data-service/models/base';
import { ExOrder, OrderStatus } from '@/db/models/ex-order';
import { BaseStrategyRunner } from '@/trade-strategy/strategy/base-strategy-runner';
import { StrategyHelper } from '@/trade-strategy/strategy/strategy-helper';
import { HOUR_MS, MINUTE_MS, SECOND_MS, wait } from '@/common/utils/utils';
import { WatchRtPriceParams } from '@/data-ex/ex-public-ws.service';

interface StartupParams {
  waitForPercent?: number;
  activePercent?: number;
  drawbackPercent: number;
}

interface RuntimeParams {
  startingPrice?: number;
  placeOrderPrice?: number;
  orderPlaced?: boolean;

  // basePointPrice?: number;
  activePrice?: number;
  activePriceReached?: boolean;
  fillingPrice?: number;
  fillingPriceReached?: boolean;
}

declare type WatchLevel =
  | 'hibernate' // 2h
  | 'sleep' // 30m
  | 'snap' // 5m
  | 'loose' // 1m
  | 'medium' // 5s
  | 'intense'; // ws

export class SimpleMoveTracing extends BaseStrategyRunner {
  constructor(
    protected strategy: Strategy,
    protected strategyHelper: StrategyHelper,
    protected logger: AppLogger,
  ) {
    super(strategy, strategyHelper, logger);
  }

  async start() {
    const strategy = this.strategy;
    if (!strategy.active) {
      this.logger.log(`strategy ${strategy.id} is not active`);
      return;
    }

    if (!strategy.params) {
      strategy.params = {
        waitForPercent: 2,
        drawbackPercent: 2,
      } as StartupParams;
    }
    if (!strategy.runtimeParams) {
      strategy.runtimeParams = {};
    }

    while (true) {
      await this.loadOrCreateDeal();

      await this.processPendingOrder();

      await this.prepareParams();

      await strategy.save();

      while (true) {
        try {
          const { placeOrder } = await this.checkAndWaitOpportunity();
          if (placeOrder) {
            await this.placeOrder();
          }

          await this.checkCommands();
        } catch (e) {
          this.logger.error(e);
          await wait(MINUTE_MS);
        }
        if (!this.strategy.active) {
          break;
        }
      }
    }
  }

  protected async checkCommands() {
    // reload strategy?
  }

  protected async createNewDeal() {
    const strategy = this.strategy;
    const currentDeal = StrategyDeal.newStrategyDeal(strategy);
    await StrategyDeal.save(currentDeal);
    strategy.currentDealId = currentDeal.id;
    strategy.currentDeal = currentDeal;
    strategy.nextTradeSide = TradeSide.buy;
    return currentDeal;
  }

  protected async loadOrCreateDeal() {
    const strategy = this.strategy;
    let currentDeal: StrategyDeal;
    if (strategy.currentDealId) {
      currentDeal = await StrategyDeal.findOneBy({
        id: strategy.currentDealId,
      });
      if (currentDeal) {
        if (currentDeal.status !== 'open') {
          currentDeal = undefined;
          strategy.currentDeal = undefined;
          strategy.currentDealId = undefined;
        }
      }
    }
    if (currentDeal) {
      const { lastOrderId, pendingOrderId } = currentDeal;
      if (lastOrderId) {
        currentDeal.lastOrder = await ExOrder.findOneBy({
          id: lastOrderId,
        });
      }
      if (currentDeal.pendingOrderId) {
        currentDeal.pendingOrder = await ExOrder.findOneBy({
          id: pendingOrderId,
        });
      }
    } else {
      await this.createNewDeal();
    }
  }

  protected async closeDeal(deal: StrategyDeal) {
    const orders = await ExOrder.find({
      select: ['id', 'side', 'execPrice', 'execSize', 'execAmount'],
      where: { dealId: deal.id, status: OrderStatus.filled },
    });
    const cal = (side: TradeSide) => {
      const sideOrders = orders.filter((o) => o.side === side);
      if (sideOrders.length === 1) {
        return [sideOrders[0].execSize, sideOrders[0].execSize];
      }
      const size = _.sumBy(sideOrders, 'execSize');
      const amount = _.sumBy(sideOrders, 'execAmount');
      const avgPrice = amount / size;
      return [size, avgPrice];
    };
    const [buySize, buyAvgPrice] = cal(TradeSide.buy);
    const [sellSize, sellAvgPrice] = cal(TradeSide.sell);
    const settleSize = Math.max(buySize, sellSize);
    // .. USD
    deal.pnlUsd = settleSize * (sellAvgPrice - buyAvgPrice);
    deal.status = 'closed';
    await deal.save();
  }

  protected async processPendingOrder() {
    const strategy = this.strategy;
    const currentDeal = strategy.currentDeal;
    if (!currentDeal?.pendingOrder) {
      return;
    }
    if (ExOrder.OrderFinished(currentDeal.pendingOrder)) {
      currentDeal.lastOrder = currentDeal.pendingOrder;
      await currentDeal.save();
    } else {
      const pendingOrder = currentDeal?.pendingOrder;
      // check is market price
      const waitSeconds = pendingOrder.priceType === 'market' ? 8 : undefined;
      const order = await this.helper.waitForOrder(pendingOrder, waitSeconds);
      if (order) {
        // finished
        if (order.status === OrderStatus.filled) {
          currentDeal.lastOrder = order;
          currentDeal.lastOrderId = order.id;
        }
        await currentDeal.save();
      } else {
        // timeout
      }
    }
    currentDeal.pendingOrder = undefined;
    currentDeal.pendingOrderId = undefined;

    const lastOrder = currentDeal.lastOrder;
    if (
      !lastOrder ||
      lastOrder.status !== OrderStatus.filled ||
      lastOrder.side === TradeSide.buy
    ) {
      return;
    }

    await this.closeDeal(currentDeal);

    await this.createNewDeal();
    await strategy.save();
  }

  protected async prepareParams() {
    const strategy = this.strategy;
    const currentDeal = strategy.currentDeal!;
    const lastOrder = currentDeal.lastOrder;

    if (lastOrder) {
      const lastSide = strategy.nextTradeSide;
      strategy.nextTradeSide =
        lastOrder.side === TradeSide.buy ? TradeSide.sell : TradeSide.buy;
      if (lastSide !== strategy.nextTradeSide) {
        this.resetStartingPrice(lastOrder.execPrice);
      }
    }
    const runtimeParams = strategy.runtimeParams as RuntimeParams;
    if (!runtimeParams.startingPrice) {
      const startingPrice = await this.helper.getLastPrice();
      this.resetStartingPrice(startingPrice);
    }
  }

  protected resetStartingPrice(startingPrice: number) {
    const strategy = this.strategy;
    let runtimeParams = strategy.runtimeParams as RuntimeParams;
    if (runtimeParams.orderPlaced) {
      return;
    }
    runtimeParams = strategy.runtimeParams = {};
    runtimeParams.startingPrice = startingPrice;
    const strategyParams: StartupParams = strategy.params;
    const wfp = strategyParams.waitForPercent;
    if (!wfp) {
      return;
    }
    const ratio =
      strategy.nextTradeSide === TradeSide.buy ? 1 - wfp / 100 : 1 + wfp / 100;
    runtimeParams.placeOrderPrice = runtimeParams.startingPrice * ratio;
  }

  protected evalDiffPercent(base: number, target: number) {
    return ((target - base) / base) * 100;
  }

  protected async checkAndWaitOpportunity(): Promise<{
    placeOrder?: boolean;
    watchLevel?: WatchLevel;
  }> {
    while (true) {
      const strategy = this.strategy;
      const runtimeParams: RuntimeParams = strategy.runtimeParams;

      const lastPrice = await this.helper.getLastPrice();

      if (!runtimeParams.placeOrderPrice) {
        runtimeParams.placeOrderPrice = lastPrice;
        return { placeOrder: true };
      }

      const placeOrderPrice = runtimeParams.placeOrderPrice;

      if (strategy.nextTradeSide === TradeSide.buy) {
        if (lastPrice <= placeOrderPrice) {
          return { placeOrder: true };
        }
      } else {
        if (lastPrice >= placeOrderPrice) {
          return { placeOrder: true };
        }
      }

      const diffPercent = this.evalDiffPercent(lastPrice, placeOrderPrice);
      const diffPercentAbs = Math.abs(diffPercent);

      const intenseWatchThreshold = 0.3;
      const intenseWatchExitThreshold = 0.1;

      let watchLevel: WatchLevel;
      if (diffPercentAbs <= intenseWatchThreshold) {
        watchLevel = 'intense';
      } else if (diffPercentAbs < 1) {
        watchLevel = 'medium';
      } else if (diffPercentAbs < 2) {
        watchLevel = 'loose';
      } else if (diffPercentAbs < 5) {
        watchLevel = 'snap';
      } else if (diffPercentAbs < 10) {
        watchLevel = 'sleep';
      } else {
        watchLevel = 'hibernate';
      }
      this.logger.log(`watch level: ${watchLevel}`);

      switch (watchLevel) {
        case 'intense':
          let watchRtPriceParams: WatchRtPriceParams;
          if (strategy.nextTradeSide === TradeSide.buy) {
            watchRtPriceParams = {
              lowerBound: placeOrderPrice,
              upperBound: lastPrice * (1 + intenseWatchExitThreshold / 100),
            };
          } else {
            watchRtPriceParams = {
              lowerBound: lastPrice * (1 - intenseWatchExitThreshold / 100),
              upperBound: placeOrderPrice,
            };
          }
          const result = await this.helper.watchRtPrice({
            ...watchRtPriceParams,
            timeoutSeconds: 10 * 60,
          });
          if (result.timeout) {
            return {};
          }
          if (strategy.nextTradeSide === TradeSide.buy) {
            if (result.reachLower) {
              return { placeOrder: true };
            }
          } else {
            if (result.reachLower) {
              return { placeOrder: true };
            }
          }
          break;
        case 'medium':
          await wait(5 * SECOND_MS);
          break;
        case 'loose':
          await wait(MINUTE_MS);
          break;
        case 'snap':
          await wait(5 * MINUTE_MS);
          break;
        case 'sleep':
          await wait(30 * MINUTE_MS);
          break;
        case 'hibernate':
          await wait(2 * HOUR_MS);
          break;
      }

      await this.checkCommands();
    }
  }

  protected async placeOrder() {
    //
  }
}
