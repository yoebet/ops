import {
  CheckOpportunityReturn,
  MVRuntimeParams,
} from '@/trade-strategy/strategy.types';
import { TradeSide } from '@/data-service/models/base';
import { evalDiffPercent } from '@/common/utils/utils';
import { BaseRunner } from '@/trade-strategy/strategy/base-runner';
import {
  evalWatchLevel,
  waitForWatchLevel,
} from '@/trade-strategy/opportunity/helper';

export async function setMVRuntimeParams(
  this: BaseRunner,
  runtimeParams: MVRuntimeParams,
  waitForPercent?: number,
) {
  const strategy = this.strategy;
  const wfp = waitForPercent;
  if (wfp) {
    const ratio =
      strategy.nextTradeSide === TradeSide.buy ? 1 - wfp / 100 : 1 + wfp / 100;
    runtimeParams.placeOrderPrice = runtimeParams.startingPrice * ratio;
    await this.logJob(
      `placeOrderPrice: ${runtimeParams.placeOrderPrice.toPrecision(6)}`,
    );
  }
}

export async function checkMVOpportunity(
  this: BaseRunner,
  runtimeParams: MVRuntimeParams,
  orderTag?: string,
): Promise<CheckOpportunityReturn> {
  const strategy = this.strategy;

  while (true) {
    const lastPrice = await this.env.getLastPrice();

    if (!runtimeParams.placeOrderPrice) {
      runtimeParams.placeOrderPrice = lastPrice;
      await this.logJob('no `placeOrderPrice`, place order now');
      return { placeOrder: true, orderTag };
    }

    const placeOrderPrice = runtimeParams.placeOrderPrice;

    if (strategy.nextTradeSide === TradeSide.buy) {
      if (lastPrice <= placeOrderPrice) {
        await this.logJob(`reach, to buy`);
        return { placeOrder: true, orderTag };
      }
    } else {
      if (lastPrice >= placeOrderPrice) {
        await this.logJob(`reach, to sell`);
        return { placeOrder: true, orderTag };
      }
    }
    const logContext =
      strategy.nextTradeSide === TradeSide.buy ? 'wait-up' : 'wait-down';

    const diffPercent = evalDiffPercent(lastPrice, placeOrderPrice);
    const diffPercentAbs = Math.abs(diffPercent);

    const watchLevel = evalWatchLevel(diffPercentAbs);
    const lps = lastPrice.toPrecision(6);
    const tps = placeOrderPrice.toPrecision(6);
    await this.logJob(
      `watch level: ${watchLevel}, ${lps}(last) -> ${tps}, ${diffPercent.toFixed(4)}%`,
      logContext,
    );

    const reachPrice = await waitForWatchLevel.call(
      this,
      watchLevel,
      lastPrice,
      placeOrderPrice,
      logContext,
    );
    if (reachPrice) {
      return { placeOrder: true, orderTag };
    }

    await this.checkCommands();
  }
}
