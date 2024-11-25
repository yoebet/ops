import { FixedDiffPriceBuy } from '@/trade-strategy/strategy/fixed-diff-price-buy';
import { Strategy } from '@/db/models/strategy';
import { StrategyEnv, StrategyJobEnv } from '@/trade-strategy/env/strategy-env';
import { AppLogger } from '@/common/app-logger';
import { TradeSide } from '@/data-service/models/base';

export class FixedDiffPriceSell extends FixedDiffPriceBuy {
  constructor(
    protected strategy: Strategy,
    protected env: StrategyEnv,
    protected jobEnv: StrategyJobEnv,
    protected logger: AppLogger,
  ) {
    super(strategy, env, jobEnv, logger);
  }

  protected newDealSide(): TradeSide {
    return TradeSide.sell;
  }
}
