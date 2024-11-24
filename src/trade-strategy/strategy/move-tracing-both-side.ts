import { Strategy } from '@/db/models/strategy';
import { StrategyEnv, StrategyJobEnv } from '@/trade-strategy/env/strategy-env';
import { AppLogger } from '@/common/app-logger';
import { MoveTracingBuy } from '@/trade-strategy/strategy/move-tracing-buy';
import { TradeSide } from '@/data-service/models/base';
import {
  MVStrategyParams,
  TradeOpportunity,
} from '@/trade-strategy/strategy.types';
import {
  checkMVOpportunity,
  setPlaceOrderPrice,
} from '@/trade-strategy/opportunity/move';

export class MoveTracingBothSide extends MoveTracingBuy {
  constructor(
    protected strategy: Strategy,
    protected env: StrategyEnv,
    protected jobEnv: StrategyJobEnv,
    protected logger: AppLogger,
  ) {
    super(strategy, env, jobEnv, logger);
  }

  protected async resetRuntimeParams() {
    if (!this.runtimeParams) {
      this.runtimeParams = {
        open: {},
        close: {},
      };
    }
    const runtimeParams = this.runtimeParams;

    const strategy = this.strategy;
    const currentDeal = strategy.currentDeal!;
    const lastOrder = currentDeal.lastOrder;
    if (!lastOrder) {
      runtimeParams.open.startingPrice = await this.env.getLastPrice();
      return;
    }

    const strategyParams: MVStrategyParams = strategy.params;
    const rps = runtimeParams.close;
    const cps = strategyParams.close;
    rps.startingPrice = lastOrder.execPrice;
    await setPlaceOrderPrice.call(this, rps, cps.waitForPercent);

    await strategy.save();
  }

  protected async checkAndWaitOpportunity(): Promise<
    TradeOpportunity | undefined
  > {
    const strategy = this.strategy;
    const lastOrder = strategy.currentDeal.lastOrder;
    if (lastOrder) {
      strategy.nextTradeSide =
        lastOrder.side === TradeSide.buy ? TradeSide.sell : TradeSide.buy;
      return checkMVOpportunity.call(
        this,
        this.runtimeParams.close,
        strategy.nextTradeSide,
        'close',
      );
    }

    const strategyParams: MVStrategyParams = strategy.params;
    const rps = this.runtimeParams.open;
    const cps = strategyParams.open;

    const buyRps = { ...rps };
    await setPlaceOrderPrice.call(this, buyRps, cps.waitForPercent);
    const $buyOppo = checkMVOpportunity.call(
      this,
      buyRps,
      TradeSide.buy,
      'open',
    );

    const sellRps = { ...rps };
    await setPlaceOrderPrice.call(this, sellRps, cps.waitForPercent);
    const $sellOppo = checkMVOpportunity.call(
      this,
      sellRps,
      TradeSide.sell,
      'open',
    );

    return Promise.race([$buyOppo, $sellOppo]);
  }
}
