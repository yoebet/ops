import * as _ from 'lodash';
import { Strategy } from '@/db/models/strategy';
import { AppLogger } from '@/common/app-logger';
import { StrategyDeal } from '@/db/models/strategy-deal';
import { TradeSide } from '@/data-service/models/base';
import { ExOrder, OrderStatus } from '@/db/models/ex-order';
import { BaseStrategyRunner } from '@/trade-strategy/strategy/base-strategy-runner';
import { StrategyHelper } from '@/trade-strategy/strategy/strategy-helper';
import { MINUTE_MS, wait } from '@/common/utils/utils';

interface StartupParams {
  waitForPercent: number;
  drawbackPercent: number;
}

interface RuntimeParams {
  basePointPrice?: number;
  placeMovingOrderPrice?: number;
  activePrice?: number;
}

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

      await this.checkAndProcessPendingOrder();

      await this.prepareParams();

      while (true) {
        try {
          // check commands

          const op = await this.checkTradeOpportunity();
          // break
          if (op) {
            // trade
            //
          }
          await wait(5 * MINUTE_MS);
        } catch (e) {
          this.logger.error(e);
          await wait(MINUTE_MS);
        }
      }
    }
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
    let strategyChanged = false;
    if (strategy.currentDealId) {
      currentDeal = await StrategyDeal.findOneBy({
        id: strategy.currentDealId,
      });
      if (currentDeal) {
        if (currentDeal.status !== 'open') {
          currentDeal = undefined;
          strategy.currentDeal = undefined;
          strategy.currentDealId = undefined;
          strategyChanged = true;
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
      strategyChanged = true;
    }
    if (strategyChanged) {
      await Strategy.save(strategy);
    }
  }

  protected async checkAndProcessPendingOrder() {
    const strategy = this.strategy;
    const currentDeal = strategy.currentDeal;
    if (!currentDeal?.pendingOrder) {
      return;
    }
    if (ExOrder.OrderFinished(currentDeal.pendingOrder)) {
      currentDeal.lastOrder = currentDeal.pendingOrder;
      await StrategyDeal.save(currentDeal);
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

    const orders = await ExOrder.find({
      select: ['id', 'side', 'execPrice', 'execSize', 'execAmount'],
      where: { dealId: currentDeal.id, status: OrderStatus.filled },
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
    currentDeal.pnlUsd = settleSize * (sellAvgPrice - buyAvgPrice);
    currentDeal.status = 'closed';
    await currentDeal.save();

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
        this.resetBp(lastOrder.execPrice);
      }
    }
    const runtimeParams = strategy.runtimeParams as RuntimeParams;
    if (!runtimeParams.basePointPrice) {
      const basePointPrice = await this.helper.getLastPrice();
      this.resetBp(basePointPrice);
    }
  }

  protected resetBp(basePointPrice: number) {
    const strategy = this.strategy;
    const runtimeParams = strategy.runtimeParams as RuntimeParams;
    runtimeParams.basePointPrice = basePointPrice;
    const strategyParams: StartupParams = strategy.params;
    const wfp = strategyParams.waitForPercent;
    const ratio =
      strategy.nextTradeSide === TradeSide.buy ? 1 - wfp / 100 : 1 + wfp / 100;
    runtimeParams.placeMovingOrderPrice = runtimeParams.basePointPrice * ratio;
  }

  protected async checkTradeOpportunity(): Promise<boolean> {
    const strategy = this.strategy;
    const tradeSide = strategy.nextTradeSide;
    const currentDeal = strategy.currentDeal!;
    const strategyParams: StartupParams = strategy.params;
    const runtimeParams: RuntimeParams = strategy.runtimeParams;

    if (tradeSide === TradeSide.buy) {
      //
    } else {
      //
    }

    return true;
  }
}
