import { Strategy } from '@/db/models/strategy';
import { StrategyEnv, StrategyJobEnv } from '@/trade-strategy/env/strategy-env';
import { AppLogger } from '@/common/app-logger';
import { MoveTracingBuy } from '@/trade-strategy/strategy/move-tracing-buy';
import { TradeSide } from '@/data-service/models/base';
import { TradeOpportunity } from '@/trade-strategy/strategy.types';
import { checkMVOpportunity } from '@/trade-strategy/opportunity/move';
import { setPlaceOrderPrice } from '@/trade-strategy/opportunity/helper';

export class MoveTracingBothSide extends MoveTracingBuy {
  constructor(
    protected strategy: Strategy,
    protected env: StrategyEnv,
    protected jobEnv: StrategyJobEnv,
    protected logger: AppLogger,
  ) {
    super(strategy, env, jobEnv, logger);
  }

  protected async checkAndWaitToOpenDeal(): Promise<
    TradeOpportunity | undefined
  > {
    const rps = this.getOpenRuntimeParams();

    const buyRps = { ...rps };
    await setPlaceOrderPrice.call(this, buyRps, TradeSide.buy);
    const $buyOppo = checkMVOpportunity.call(
      this,
      buyRps,
      TradeSide.buy,
      'open',
    );

    const sellRps = { ...rps };
    await setPlaceOrderPrice.call(this, sellRps, TradeSide.sell);
    const $sellOppo = checkMVOpportunity.call(
      this,
      sellRps,
      TradeSide.sell,
      'open',
    );

    return Promise.race([$buyOppo, $sellOppo]);
  }

  protected async checkAndWaitToCloseDeal(): Promise<TradeOpportunity> {
    const lastOrder = this.strategy.currentDeal.lastOrder;
    const side = this.inverseSide(lastOrder.side);
    return checkMVOpportunity.call(
      this,
      this.getCloseRuntimeParams(),
      side,
      'close',
    );
  }
}
