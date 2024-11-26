import { Strategy } from '@/db/models/strategy';
import { AppLogger } from '@/common/app-logger';
import { TradeSide } from '@/data-service/models/base';
import { StrategyEnv, StrategyJobEnv } from '@/trade-strategy/env/strategy-env';
import {
  MVRuntimeParams,
  TradeOpportunity,
} from '@/trade-strategy/strategy.types';
import { checkMVOpportunity } from '@/trade-strategy/opportunity/move';
import { RuntimeParamsRunner } from '@/trade-strategy/strategy/runtime-params-runner';
import { setPlaceOrderPrice } from '@/trade-strategy/opportunity/helper';

export class MoveTracingBuy extends RuntimeParamsRunner<
  MVRuntimeParams,
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

  protected newDealSide(): TradeSide {
    return TradeSide.buy;
  }

  protected async checkAndWaitToOpenDeal(): Promise<TradeOpportunity> {
    const side = this.newDealSide();
    const rps = this.getOpenRuntimeParams();
    if (!rps.startingPrice) {
      rps.startingPrice = await this.env.getLastPrice();
      await setPlaceOrderPrice.call(this, rps, side);
    }
    return checkMVOpportunity.call(this, rps, side, 'open');
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

  protected async placeOrder(oppo: TradeOpportunity) {
    const { order, params } = await this.buildMoveTpslOrder(
      oppo,
      oppo.orderTag === 'open'
        ? this.getOpenRuntimeParams()
        : this.getCloseRuntimeParams(),
    );

    await order.save();

    await this.doPlaceOrder(order, params);
  }
}
