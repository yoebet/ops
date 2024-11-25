import { Strategy } from '@/db/models/strategy';
import { StrategyEnv, StrategyJobEnv } from '@/trade-strategy/env/strategy-env';
import { AppLogger } from '@/common/app-logger';
import {
  BRCheckerParams,
  MVRuntimeParams,
  TradeOpportunity,
} from '@/trade-strategy/strategy.types';
import { checkBurstOpp } from '@/trade-strategy/opportunity/burst';
import { checkMVOpportunity } from '@/trade-strategy/opportunity/move';
import { RuntimeParamsRunner } from '@/trade-strategy/strategy/runtime-params-runner';
import { setPlaceOrderPrice } from '@/trade-strategy/opportunity/helper';

export class BurstMonitor extends RuntimeParamsRunner<
  BRCheckerParams,
  MVRuntimeParams
> {
  constructor(
    protected strategy: Strategy,
    protected env: StrategyEnv,
    protected jobEnv: StrategyJobEnv,
    protected logger: AppLogger,
  ) {
    super(strategy, env, jobEnv, logger);
  }

  protected async checkAndWaitToOpenDeal(): Promise<TradeOpportunity> {
    return checkBurstOpp.call(this, this.getOpenRuntimeParams(), 'open');
  }

  protected async checkAndWaitToCloseDeal(): Promise<TradeOpportunity> {
    const currentDeal = this.strategy.currentDeal!;
    const lastOrder = currentDeal.lastOrder;
    const side = this.inverseSide(lastOrder.side);
    const rps = this.getCloseRuntimeParams();
    if (rps.startingPrice !== lastOrder.execPrice) {
      rps.startingPrice = lastOrder.execPrice;
      await setPlaceOrderPrice.call(this, rps, side);
    }
    return checkMVOpportunity.call(this, rps, side, 'close');
  }

  protected async placeOrder(oppo: TradeOpportunity): Promise<void> {
    const { order, params } = await (oppo.orderTag === 'open'
      ? this.buildMarketOrder(oppo)
      : this.buildMoveTpslOrder(oppo, this.getCloseRuntimeParams()));

    await order.save();

    await this.doPlaceOrder(order, params);
  }
}
