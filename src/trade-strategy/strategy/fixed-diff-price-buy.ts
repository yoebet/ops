import { Strategy } from '@/db/models/strategy';
import { StrategyEnv, StrategyJobEnv } from '@/trade-strategy/env/strategy-env';
import { AppLogger } from '@/common/app-logger';
import {
  PriceDiffRuntimeParams,
  TradeOpportunity,
} from '@/trade-strategy/strategy.types';
import { TradeSide } from '@/data-service/models/base';
import { RuntimeParamsRunner } from '@/trade-strategy/strategy/runtime-params-runner';
import { waitToPlaceOrder } from '@/trade-strategy/opportunity/fixed';

export class FixedDiffPriceBuy extends RuntimeParamsRunner<
  PriceDiffRuntimeParams,
  PriceDiffRuntimeParams
> {
  constructor(
    protected strategy: Strategy,
    protected env: StrategyEnv,
    protected jobEnv: StrategyJobEnv,
    protected logger: AppLogger,
  ) {
    super(strategy, env, jobEnv, logger);
  }

  protected newDealSide(): TradeSide {
    return TradeSide.buy;
  }

  protected async checkAndWaitToOpenDeal(): Promise<TradeOpportunity> {
    const side = this.newDealSide();
    const rps = this.getOpenRuntimeParams();
    return waitToPlaceOrder.call(this, rps, side, 'open');
  }

  protected async checkAndWaitToCloseDeal(): Promise<TradeOpportunity> {
    const currentDeal = this.strategy.currentDeal!;
    const lastOrder = currentDeal.lastOrder;
    const side = this.inverseSide(lastOrder.side);
    const rps = this.getCloseRuntimeParams();
    rps.startingPrice = lastOrder.execPrice;
    return waitToPlaceOrder.call(this, rps, side, 'close');
  }

  protected async placeOrder(oppo: TradeOpportunity): Promise<void> {
    const { order, params } = await this.buildLimitOrder(oppo);

    await order.save();

    await this.doPlaceOrder(order, params);
  }
}
