import {
  TradeOpportunity,
  MVRuntimeParams,
} from '@/trade-strategy/strategy.types';
import { TradeSide } from '@/data-service/models/base';
import { evalDiffPercent } from '@/common/utils/utils';
import { BaseRunner } from '@/trade-strategy/strategy/base-runner';
import {
  evalWatchLevel,
  waitForWatchLevel,
} from '@/trade-strategy/opportunity/helper';

export async function setPlaceOrderPrice(
  this: BaseRunner,
  params: MVRuntimeParams,
  side: TradeSide,
  waitForPercent?: number,
) {
  const wfp = waitForPercent;
  if (wfp) {
    const ratio = side === TradeSide.buy ? 1 - wfp / 100 : 1 + wfp / 100;
    params.placeOrderPrice = params.startingPrice * ratio;
    await this.logJob(
      `placeOrderPrice: ${params.placeOrderPrice.toPrecision(6)}`,
    );
  }
}

export async function checkMVOpportunity(
  this: BaseRunner,
  params: MVRuntimeParams,
  side: TradeSide,
  orderTag?: string,
): Promise<TradeOpportunity | undefined> {
  while (true) {
    const lastPrice = await this.env.getLastPrice();

    if (!params.placeOrderPrice) {
      params.placeOrderPrice = lastPrice;
      await this.logJob('no `placeOrderPrice`, place order now');
      return { orderTag, side };
    }

    const placeOrderPrice = params.placeOrderPrice;

    if (side === TradeSide.buy) {
      if (lastPrice <= placeOrderPrice) {
        await this.logJob(`reach, to buy`);
        return { orderTag, side };
      }
    } else {
      if (lastPrice >= placeOrderPrice) {
        await this.logJob(`reach, to sell`);
        return { orderTag, side };
      }
    }
    const logContext = side === TradeSide.buy ? 'wait-up' : 'wait-down';

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
      return { orderTag, side, placeOrderPrice };
    }

    await this.checkCommands();
  }
}
