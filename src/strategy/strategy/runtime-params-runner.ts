import { BaseRunner } from '@/strategy/strategy/base-runner';
import { Strategy } from '@/db/models/strategy/strategy';
import { StrategyEnv, StrategyJobEnv } from '@/strategy/env/strategy-env';
import { AppLogger } from '@/common/app-logger';
import * as _ from 'lodash';
import {
  CommonStrategyParams,
  StopLossParams,
  TradeOpportunity,
} from '@/strategy/strategy.types';
import { TimeLevel } from '@/db/models/time-level';
import { MINUTE_MS, wait } from '@/common/utils/utils';
import {
  checkPriceReached,
  evalTargetPrice,
  waitForPrice,
} from '@/strategy/opportunity/helper';
import { StrategyDeal } from '@/db/models/strategy/strategy-deal';
import { ExOrder, OrderTag } from '@/db/models/ex-order';
import { TradeSide } from '@/data-service/models/base';

export abstract class RuntimeParamsRunner<
  ORP = any,
  CRP = ORP,
> extends BaseRunner {
  protected _runtimeParams: CommonStrategyParams<ORP, CRP>;

  protected constructor(
    protected readonly strategy: Strategy,
    protected env: StrategyEnv,
    protected jobEnv: StrategyJobEnv,
    protected logger: AppLogger,
  ) {
    super(strategy, env, jobEnv, logger);
  }

  protected get strategyParams(): CommonStrategyParams<ORP, CRP> {
    if (!this.strategy.params) {
      this.strategy.params = {};
    }
    return this.strategy.params;
  }

  protected getRuntimeParams(): CommonStrategyParams<ORP, CRP> {
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
    return this.getRuntimeParamsOf(OrderTag.open);
  }

  protected getCloseRuntimeParams(): CRP {
    return this.getRuntimeParamsOf(OrderTag.close);
  }

  protected async closeDeal(deal: StrategyDeal): Promise<void> {
    await super.closeDeal(deal);

    this._runtimeParams = undefined;
  }

  protected async checkAndWaitOpportunity(): Promise<TradeOpportunity> {
    const strategy = this.strategy;
    const { currentDeal, lastDealId } = this.strategy;
    if (!currentDeal) {
      return undefined;
    }
    const lastOrder = currentDeal.lastOrder;
    const rps = this.getRuntimeParams();
    if (lastOrder?.exUpdatedAt) {
      const lastOrderTs = lastOrder.exUpdatedAt.getTime();
      const elapsed = Date.now() - lastOrderTs;
      const oppositeSide = this.inverseSide(lastOrder.side);
      if (rps.minCloseInterval) {
        const minCloseSeconds = TimeLevel.evalIntervalSeconds(
          rps.minCloseInterval,
        );
        if (elapsed < minCloseSeconds * 1000) {
          await this.waitOnce(elapsed);
          return undefined;
        }
      }
      if (rps.maxCloseInterval) {
        const seconds = TimeLevel.evalIntervalSeconds(rps.maxCloseInterval);
        if (elapsed > seconds * 1000) {
          const oppo: TradeOpportunity = {
            orderTag: OrderTag.forceclose,
            side: oppositeSide,
          };
          await this.buildMarketOrder(oppo);
          await this.placeOrder(oppo);
          return undefined;
        }
      }
    }

    if (lastOrder) {
      // close
      if (rps.stopLoss?.priceDiffPercent) {
        const [cp, slp] = await Promise.all([
          this.checkAndWaitToCloseDeal().then((op) => {
            if (op?.order) {
              this.ov++;
            }
            return op;
          }),
          this.checkAndWaitToStopLoss(),
        ]);
        return cp || slp;
      } else {
        return this.checkAndWaitToCloseDeal();
      }
    }

    // open ...
    const ov = this.ov;

    if (rps.lossCoolDownInterval && lastDealId) {
      if (!strategy.lastDeal) {
        strategy.lastDeal = await StrategyDeal.findOneBy({
          id: lastDealId,
        });
      }
      const lastDeal = strategy.lastDeal;
      const seconds = TimeLevel.evalIntervalSeconds(rps.lossCoolDownInterval);
      if (
        lastDeal &&
        lastDeal.closedAt &&
        lastDeal.pnlUsd &&
        lastDeal.pnlUsd < 0
      ) {
        const timeSpan = Date.now() - lastDeal.closedAt.getTime();
        if (timeSpan < seconds * 1000) {
          await this.waitOnce(timeSpan);
          return undefined;
        }
      }
    }
    if (ov !== this.ov) {
      return undefined;
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
    const ov = this.ov;
    const strategy = this.strategy;
    let lastOrder = strategy.currentDeal?.lastOrder;
    if (lastOrder?.tag !== 'open') {
      return undefined;
    }
    const slSide = this.inverseSide(lastOrder.side);
    const rps = this.getRuntimeParams();
    const stopLossParams: StopLossParams = rps.stopLoss;
    const priceDiffPercent = stopLossParams?.priceDiffPercent;
    if (!priceDiffPercent) {
      return undefined;
    }

    const slPrice = evalTargetPrice(
      lastOrder.execPrice,
      priceDiffPercent,
      lastOrder.side,
    );

    const _price = await waitForPrice.call(this, lastOrder.side, slPrice);

    lastOrder = strategy.currentDeal?.lastOrder;
    if (lastOrder?.tag !== 'open') {
      return undefined;
    }
    if (ov !== this.ov) {
      return undefined;
    }

    const oppo: TradeOpportunity = {
      orderTag: OrderTag.stoploss,
      side: slSide,
    };
    await this.buildMarketOrder(oppo);
    await this.placeOrder(oppo);

    return undefined;
  }

  protected async shouldCancelOrder(pendingOrder: ExOrder): Promise<boolean> {
    if (pendingOrder.cancelPrice) {
      const lastPrice = await this.env.getLastPrice();
      if (pendingOrder.side === TradeSide.buy) {
        if (lastPrice >= pendingOrder.cancelPrice) {
          return true;
        }
      } else {
        if (lastPrice <= pendingOrder.cancelPrice) {
          return true;
        }
      }
    }
    if (pendingOrder.tag !== OrderTag.close) {
      return false;
    }

    const currentDeal = this.strategy.currentDeal;
    if (!currentDeal) {
      return false;
    }
    const lastOrder = currentDeal.lastOrder;
    if (lastOrder.tag === OrderTag.close) {
      return true;
    }
    const rps = this.getRuntimeParams();
    const stopLossParams: StopLossParams = rps.stopLoss;
    const priceDiffPercent = stopLossParams?.priceDiffPercent;
    if (!priceDiffPercent) {
      return false;
    }
    const slPrice = evalTargetPrice(
      lastOrder.execPrice,
      priceDiffPercent,
      lastOrder.side,
    );
    return await checkPriceReached.call(this, lastOrder.side, slPrice);
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
