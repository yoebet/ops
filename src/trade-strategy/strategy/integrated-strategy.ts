import { RuntimeParamsRunner } from '@/trade-strategy/strategy/runtime-params-runner';
import {
  IntegratedStrategyParams,
  OppCheckerAlgo,
  CheckOpportunityParams,
  TradeOpportunity,
} from '@/trade-strategy/strategy.types';
import { Strategy } from '@/db/models/strategy';
import { StrategyEnv, StrategyJobEnv } from '@/trade-strategy/env/strategy-env';
import { AppLogger } from '@/common/app-logger';
import { checkBurstOpp } from '@/trade-strategy/opportunity/burst';
import { waitToPlaceLimitOrder } from '@/trade-strategy/opportunity/fixed';
import { checkJumpOpp } from '@/trade-strategy/opportunity/jump';
import { checkMVOpp } from '@/trade-strategy/opportunity/move';
import { checkLongStillOpp } from '@/trade-strategy/opportunity/long-still';

export class IntegratedStrategy extends RuntimeParamsRunner {
  protected _runtimeParams: IntegratedStrategyParams & any;

  constructor(
    protected strategy: Strategy,
    protected env: StrategyEnv,
    protected jobEnv: StrategyJobEnv,
    protected logger: AppLogger,
  ) {
    super(strategy, env, jobEnv, logger);
  }

  protected async checkAndWaitToOpenDeal(): Promise<TradeOpportunity> {
    const params: CheckOpportunityParams = this.getOpenRuntimeParams();
    const orderTag = 'open';
    const side = this.strategy.openDealSide;
    switch (params.algo) {
      case OppCheckerAlgo.BR:
        return checkBurstOpp.call(this, params, side, orderTag);
      case OppCheckerAlgo.FP:
        return waitToPlaceLimitOrder.call(this, params, side, orderTag);
      case OppCheckerAlgo.LS:
        return checkLongStillOpp.call(this, params, side, orderTag);
      case OppCheckerAlgo.MV:
        return checkMVOpp.call(this, params, side, orderTag);
      case OppCheckerAlgo.JP:
        return checkJumpOpp.call(this, params, side, orderTag);
      default:
        return undefined;
    }
  }

  protected async checkAndWaitToCloseDeal(): Promise<TradeOpportunity> {
    const lastOrder = this.strategy.currentDeal?.lastOrder;
    if (!lastOrder) {
      return undefined;
    }

    const params: CheckOpportunityParams = this.getCloseRuntimeParams();
    const orderTag = 'close';
    const side = this.inverseSide(lastOrder.side);
    switch (params.algo) {
      case OppCheckerAlgo.BR:
        return checkBurstOpp.call(this, params, side, orderTag);
      case OppCheckerAlgo.FP:
        params.startingPrice = lastOrder.execPrice;
        return waitToPlaceLimitOrder.call(this, params, side, orderTag);
      case OppCheckerAlgo.LS:
        return checkLongStillOpp.call(this, params, side, orderTag);
      case OppCheckerAlgo.MV:
        params.startingPrice = lastOrder.execPrice;
        return checkMVOpp.call(this, params, side, orderTag);
      case OppCheckerAlgo.JP:
        return checkJumpOpp.call(this, params, side, orderTag);
      default:
        return undefined;
    }
  }
}
