import { BaseRunner } from '@/trade-strategy/strategy/base-runner';
import { Strategy } from '@/db/models/strategy';
import { StrategyEnv, StrategyJobEnv } from '@/trade-strategy/env/strategy-env';
import { AppLogger } from '@/common/app-logger';
import * as _ from 'lodash';
import {
  CommonStrategyParams,
  TradeOpportunity,
} from '@/trade-strategy/strategy.types';
import { TimeLevel } from '@/db/models/time-level';
import { MINUTE_MS, wait } from '@/common/utils/utils';
import {
  evalTargetPrice,
  waitForPrice,
} from '@/trade-strategy/opportunity/helper';

export abstract class RuntimeParamsRunner<
  ORP = any,
  CRP = any,
> extends BaseRunner {
  protected runtimeParams: CommonStrategyParams & {
    open: ORP;
    close: CRP;
  } & any;

  protected constructor(
    protected strategy: Strategy,
    protected env: StrategyEnv,
    protected jobEnv: StrategyJobEnv,
    protected logger: AppLogger,
  ) {
    super(strategy, env, jobEnv, logger);
  }

  protected get strategyParams(): CommonStrategyParams {
    if (!this.strategy.params) {
      this.strategy.params = {};
    }
    return this.strategy.params;
  }

  protected getRuntimeSubParams(orderTag: string) {
    if (!this.runtimeParams) {
      this.runtimeParams = _.merge({}, this.strategyParams) as any;
    }
    let rp = this.runtimeParams[orderTag];
    if (!rp) {
      rp = {};
      this.runtimeParams[orderTag] = rp;
    }
    return rp;
  }

  protected getOpenRuntimeParams(): ORP {
    return this.getRuntimeSubParams('open');
  }

  protected getCloseRuntimeParams(): CRP {
    return this.getRuntimeSubParams('close');
  }

  protected async checkAndWaitOpportunity(): Promise<TradeOpportunity> {
    const currentDeal = this.strategy.currentDeal!;
    const lastOrder = currentDeal.lastOrder;
    if (lastOrder) {
      const lastOrderTs = lastOrder.exUpdatedAt.getTime();
      const timeElapse = Date.now() - lastOrderTs;
      const oppositeSide = this.inverseSide(lastOrder.side);
      const rps = this.runtimeParams;
      if (rps.minTpslInterval) {
        if (!rps.minTpslIntervalSeconds) {
          rps.minTpslIntervalSeconds = TimeLevel.evalIntervalSeconds(
            rps.minTpslInterval,
          );
        }
        if (timeElapse < rps.minTpslIntervalSeconds * 1000) {
          if (timeElapse > 10 * MINUTE_MS) {
            await wait(10 * MINUTE_MS);
          } else if (timeElapse > MINUTE_MS) {
            await wait(MINUTE_MS);
          } else {
            await wait(5 * 1000);
          }
          return undefined;
        }
      }
      if (rps.maxCloseInterval) {
        if (!rps.maxCloseIntervalSeconds) {
          rps.maxCloseIntervalSeconds = TimeLevel.evalIntervalSeconds(
            rps.maxCloseInterval,
          );
        }
        if (timeElapse > rps.maxCloseIntervalSeconds * 1000) {
          const { order, params } = await this.buildMarketOrder({
            orderTag: 'force-close',
            side: oppositeSide,
          });
          await order.save();
          await this.doPlaceOrder(order, params);
          return undefined;
        }
      }
      if (rps.slPriceDiffPercent) {
        return Promise.race([
          this.checkAndWaitToStopLoss(),
          this.checkAndWaitToCloseDeal(),
        ]);
      } else {
        return this.checkAndWaitToCloseDeal();
      }
    }
    return this.checkAndWaitToOpenDeal();
  }

  protected abstract checkAndWaitToOpenDeal(): Promise<TradeOpportunity>;

  protected abstract checkAndWaitToCloseDeal(): Promise<TradeOpportunity>;

  protected async checkAndWaitToStopLoss(): Promise<TradeOpportunity> {
    const currentDeal = this.strategy.currentDeal!;
    const lastOrder = currentDeal.lastOrder;
    if (!lastOrder) {
      return undefined;
    }
    const oppositeSide = this.inverseSide(lastOrder.side);
    const rps = this.runtimeParams;
    if (!rps.slPriceDiffPercent) {
      return undefined;
    }

    if (!rps.slPrice) {
      rps.slPrice = evalTargetPrice(
        lastOrder.execPrice,
        rps.slPriceDiffPercent,
        oppositeSide,
      );
    }

    const _price = await waitForPrice.call(this, oppositeSide, rps.slPrice);

    const { order, params } = await this.buildMarketOrder({
      orderTag: 'stop-loss',
      side: oppositeSide,
    });
    await order.save();
    await this.doPlaceOrder(order, params);

    return undefined;
  }
}
