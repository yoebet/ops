import { BaseRunner } from '@/trade-strategy/strategy/base-runner';
import { Strategy } from '@/db/models/strategy';
import { StrategyEnv, StrategyJobEnv } from '@/trade-strategy/env/strategy-env';
import { AppLogger } from '@/common/app-logger';
import * as _ from 'lodash';
import {
  CommonStrategyParams,
  StopLossParams,
  TradeOpportunity,
} from '@/trade-strategy/strategy.types';
import { TimeLevel } from '@/db/models/time-level';
import { MINUTE_MS, wait } from '@/common/utils/utils';
import {
  evalTargetPrice,
  waitForPrice,
} from '@/trade-strategy/opportunity/helper';
import { StrategyDeal } from '@/db/models/strategy-deal';

export abstract class RuntimeParamsRunner<
  ORP = any,
  CRP = any,
> extends BaseRunner {
  protected _runtimeParams: CommonStrategyParams & {
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

  protected getRuntimeParams(): CommonStrategyParams & any {
    if (!this._runtimeParams) {
      this._runtimeParams = _.merge({}, this.strategyParams) as any;
    }
    return this._runtimeParams;
  }

  protected getRuntimeParamsOf(orderTag: string) {
    const runtimeParams = this.getRuntimeParams();
    let rp = runtimeParams[orderTag];
    if (!rp) {
      rp = {};
      this._runtimeParams[orderTag] = rp;
    }
    return rp;
  }

  protected getOpenRuntimeParams(): ORP {
    return this.getRuntimeParamsOf('open');
  }

  protected getCloseRuntimeParams(): CRP {
    return this.getRuntimeParamsOf('close');
  }

  protected async closeDeal(deal: StrategyDeal): Promise<void> {
    await super.closeDeal(deal);

    this._runtimeParams = undefined;
  }

  protected async checkAndWaitOpportunity(): Promise<TradeOpportunity> {
    const strategy = this.strategy;
    const { currentDeal, lastDealId } = this.strategy;
    const lastOrder = currentDeal.lastOrder;
    const rps = this.getRuntimeParams();
    if (lastOrder) {
      const lastOrderTs = lastOrder.exUpdatedAt.getTime();
      const elapsed = Date.now() - lastOrderTs;
      const oppositeSide = this.inverseSide(lastOrder.side);
      if (rps.minCloseInterval) {
        if (!rps.minCloseIntervalSeconds) {
          rps.minCloseIntervalSeconds = TimeLevel.evalIntervalSeconds(
            rps.minCloseInterval,
          );
        }
        if (elapsed < rps.minCloseIntervalSeconds * 1000) {
          await this.waitOnce(elapsed);
          return undefined;
        }
      }
      if (rps.maxCloseInterval) {
        if (!rps.maxCloseIntervalSeconds) {
          rps.maxCloseIntervalSeconds = TimeLevel.evalIntervalSeconds(
            rps.maxCloseInterval,
          );
        }
        if (elapsed > rps.maxCloseIntervalSeconds * 1000) {
          const oppo: TradeOpportunity = {
            orderTag: 'force-close',
            side: oppositeSide,
          };
          await this.buildMarketOrder(oppo);
          await oppo.order.save();
          await this.doPlaceOrder(oppo.order, oppo.params);
          return undefined;
        }
      }
      if (rps.stopLoss?.priceDiffPercent) {
        return Promise.race([
          this.checkAndWaitToStopLoss(),
          this.checkAndWaitToCloseDeal(),
        ]);
      } else {
        return this.checkAndWaitToCloseDeal();
      }
    }

    if (rps.lossCoolDownInterval && lastDealId) {
      if (!rps.lossCoolDownIntervalSeconds) {
        rps.lossCoolDownIntervalSeconds = TimeLevel.evalIntervalSeconds(
          rps.lossCoolDownInterval,
        );
      }
      if (!strategy.lastDeal) {
        strategy.lastDeal = await StrategyDeal.findOneBy({
          id: lastDealId,
        });
      }
      const lastDeal = strategy.lastDeal;
      if (
        lastDeal &&
        lastDeal.closedAt &&
        lastDeal.pnlUsd &&
        lastDeal.pnlUsd < 0
      ) {
        const timeSpan = Date.now() - lastDeal.closedAt.getTime();
        if (timeSpan < rps.lossCoolDownIntervalSeconds * 1000) {
          await this.waitOnce(timeSpan);
          return undefined;
        }
      }
    }
    return this.checkAndWaitToOpenDeal();
  }

  protected async waitOnce(timeSpan: number): Promise<void> {
    if (timeSpan > 10 * MINUTE_MS) {
      await wait(10 * MINUTE_MS);
    } else if (timeSpan > MINUTE_MS) {
      await wait(MINUTE_MS);
    } else {
      await wait(5 * 1000);
    }
  }

  protected abstract checkAndWaitToOpenDeal(): Promise<TradeOpportunity>;

  protected abstract checkAndWaitToCloseDeal(): Promise<TradeOpportunity>;

  protected async checkAndWaitToStopLoss(): Promise<TradeOpportunity> {
    const currentDeal = this.strategy.currentDeal!;
    const lastOrder = currentDeal.lastOrder;
    if (!lastOrder) {
      return undefined;
    }
    const slSide = this.inverseSide(lastOrder.side);
    const rps = this.getRuntimeParams();
    const stopLossParams: StopLossParams = rps.stopLoss;
    const priceDiffPercent = stopLossParams?.limitPriceDiffPercent;
    if (!priceDiffPercent) {
      return undefined;
    }

    const slPrice = evalTargetPrice(
      lastOrder.execPrice,
      priceDiffPercent,
      slSide,
    );

    const _price = await waitForPrice.call(this, slSide, slPrice);

    const oppo: TradeOpportunity = {
      orderTag: 'stop-loss',
      side: slSide,
    };
    await this.buildMarketOrder(oppo);
    await oppo.order.save();
    await this.doPlaceOrder(oppo.order, oppo.params);

    return undefined;
  }

  protected async placeOrder(oppo: TradeOpportunity): Promise<void> {
    if (!oppo.order) {
      if (oppo.orderPrice) {
        await super.buildLimitOrder(oppo);
      } else {
        await super.buildMarketOrder(oppo);
      }
    }
    return super.placeOrder(oppo);
  }
}
