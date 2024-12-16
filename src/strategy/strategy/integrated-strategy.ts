import { RuntimeParamsRunner } from '@/strategy/strategy/runtime-params-runner';
import {
  CheckOpportunityParams,
  OppCheckerAlgo,
  TradeOpportunity,
} from '@/strategy/strategy.types';
import { Strategy } from '@/db/models/strategy/strategy';
import { StrategyEnv, StrategyJobEnv } from '@/strategy/env/strategy-env';
import { AppLogger } from '@/common/app-logger';
import { checkBurstOpp } from '@/strategy/opportunity/burst';
import { waitToPlaceLimitOrder } from '@/strategy/opportunity/tpsl';
import { checkJumpOpp } from '@/strategy/opportunity/jump';
import { checkMVOpp } from '@/strategy/opportunity/move';
import { checkLongStillOpp } from '@/strategy/opportunity/long-still';
import { OrderTag } from '@/db/models/ex-order';
import { checkBollingerBandOpp } from '@/strategy/opportunity/bollinger';

export class IntegratedStrategy extends RuntimeParamsRunner<CheckOpportunityParams> {
  constructor(
    protected readonly strategy: Strategy,
    protected env: StrategyEnv,
    protected jobEnv: StrategyJobEnv,
    protected logger: AppLogger,
  ) {
    super(strategy, env, jobEnv, logger);
  }

  protected async checkAndWaitToOpenDeal(): Promise<TradeOpportunity> {
    const params = this.getOpenRuntimeParams();
    const side = this.strategy.openDealSide;
    const oppor: Partial<TradeOpportunity> = {
      orderTag: OrderTag.open,
    };
    switch (params.algo) {
      case OppCheckerAlgo.BR:
        return checkBurstOpp.call(this, params, side, oppor);
      case OppCheckerAlgo.TP:
        return waitToPlaceLimitOrder.call(this, params, side, oppor);
      case OppCheckerAlgo.LS:
        return checkLongStillOpp.call(this, params, side, oppor);
      case OppCheckerAlgo.MV:
        return checkMVOpp.call(this, params, side, oppor);
      case OppCheckerAlgo.JP:
        return checkJumpOpp.call(this, params, side, oppor);
      case OppCheckerAlgo.BB:
        return checkBollingerBandOpp.call(this, params, side, oppor);
      default:
        return undefined;
    }
  }

  protected async checkAndWaitToCloseDeal(): Promise<TradeOpportunity> {
    const lastOrder = this.strategy.currentDeal?.lastOrder;
    if (!lastOrder) {
      return undefined;
    }

    const side = this.inverseSide(lastOrder.side);
    const params = this.getCloseRuntimeParams();
    const oppor: Partial<TradeOpportunity> = {
      orderTag: OrderTag.close,
      orderSize: lastOrder.execSize,
      orderAmount: lastOrder.execAmount,
    };
    switch (params.algo) {
      case OppCheckerAlgo.BR:
        return checkBurstOpp.call(this, params, side, oppor);
      case OppCheckerAlgo.TP:
        params.startingPrice = lastOrder.execPrice;
        return waitToPlaceLimitOrder.call(this, params, side, oppor);
      case OppCheckerAlgo.LS:
        return checkLongStillOpp.call(this, params, side, oppor);
      case OppCheckerAlgo.MV:
        params.startingPrice = lastOrder.execPrice;
        return checkMVOpp.call(this, params, side, oppor);
      case OppCheckerAlgo.JP:
        return checkJumpOpp.call(this, params, side, oppor);
      default:
        return undefined;
    }
  }
}
