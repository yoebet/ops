import { Strategy } from '@/db/models/strategy';
import { Exchanges } from '@/exchange/exchanges';
import { AppLogger } from '@/common/app-logger';
import { StrategyDeal } from '@/db/models/strategy-deal';
import { TradeSide } from '@/data-service/models/base';
import { ExOrder } from '@/db/models/ex-order';
import { BaseStrategyRunner } from '@/trade-strategy/strategy/base-strategy-runner';
import { StrategyHelper } from '@/trade-strategy/strategy/strategy-helper';

interface MoveTracingParams {
  drawbackPercent?: number;
  // activePrice?: number;
  waitForPercent?: number;
}

export class SimpleMoveTracing extends BaseStrategyRunner {
  constructor(
    protected strategy: Strategy,
    protected strategyHelper: StrategyHelper,
    protected logger: AppLogger,
  ) {
    super(strategy, strategyHelper, logger);
  }

  protected async checkDeal() {
    const strategy = this.strategy;
    let currentDeal: StrategyDeal;
    let newDeal = false;
    let strategyChanged = false;
    if (strategy.currentDealId) {
      currentDeal = await StrategyDeal.findOneBy({
        id: strategy.currentDealId,
      });
      if (currentDeal) {
        if (currentDeal.status !== 'open') {
          strategy.lastDealId = currentDeal.id;
          strategy.currentDealId = undefined;
          currentDeal = undefined;
          newDeal = true;
          strategyChanged = true;
        }
      }
    } else {
      newDeal = true;
    }
    if (newDeal) {
      currentDeal = StrategyDeal.newStrategyDeal(strategy);
      await StrategyDeal.save(currentDeal);
      strategy.currentDealId = currentDeal.id;
      strategyChanged = true;
    }
    if (strategyChanged) {
      await Strategy.save(strategy);
    }
    currentDeal = currentDeal!;
    let aboutTo = TradeSide.buy;
    let lastOrder = currentDeal.lastOrder;
    let pendingOrder = currentDeal.pendingOrder;
    if (pendingOrder) {
      const order = await ExOrder.findOneBy({ id: pendingOrder.id });
      if (ExOrder.OrderFinished(order)) {
        lastOrder = currentDeal.lastOrder = pendingOrder;
        currentDeal.pendingOrder = undefined;
        pendingOrder = undefined;
        await StrategyDeal.save(currentDeal);
      }
    }
    if (lastOrder) {
      aboutTo =
        lastOrder.side === TradeSide.buy ? TradeSide.sell : TradeSide.buy;
    }

    return {
      currentDeal,
      lastOrder,
      pendingOrder,
      aboutTo,
      newDeal,
    };
  }

  protected async checkTradeOpportunity(side: TradeSide): Promise<boolean> {
    return true;
  }

  async start() {
    const strategy = this.strategy;
    if (!strategy.active) {
      this.logger.log(`strategy ${strategy.id} is not active`);
      return;
    }

    const checkDealResult = await this.checkDeal();

    if (checkDealResult.pendingOrder) {
      //
    }

    while (true) {
      const op = await this.checkTradeOpportunity(checkDealResult.aboutTo);
      //
    }
  }
}
