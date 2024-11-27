import {
  evalTargetPrice,
  waitForPrice,
} from '@/trade-strategy/opportunity/helper';
import {
  ConsiderSide,
  PriceDiffParams,
  TradeOpportunity,
} from '@/trade-strategy/strategy.types';
import { TradeSide } from '@/data-service/models/base';
import { BaseRunner } from '@/trade-strategy/strategy/base-runner';

export async function waitToPlaceLimitOrder(
  this: BaseRunner,
  rps: PriceDiffParams,
  side: ConsiderSide,
  orderTag?: string,
): Promise<TradeOpportunity | undefined> {
  if (!rps.startingPrice) {
    rps.startingPrice = await this.env.getLastPrice();
  }

  if (side === 'both') {
    return Promise.race([
      waitToPlaceOrderOneSide.call(this, rps, TradeSide.buy, orderTag),
      waitToPlaceOrderOneSide.call(this, rps, TradeSide.sell, orderTag),
    ]);
  } else {
    return waitToPlaceOrderOneSide.call(this, rps, side, orderTag);
  }
}

async function waitToPlaceOrderOneSide(
  this: BaseRunner,
  rps: PriceDiffParams,
  side: TradeSide,
  orderTag?: string,
): Promise<TradeOpportunity | undefined> {
  let basePointPrice = rps.startingPrice;
  if (rps.waitForTriggerPercent) {
    const wfp = rps.waitForTriggerPercent;
    if (wfp) {
      basePointPrice = evalTargetPrice(rps.startingPrice, wfp, side);
      await this.logJob(`target-price: ${basePointPrice.toPrecision(6)}`);
    }
  }
  const targetPrice = await waitForPrice.call(this, side, basePointPrice);
  if (!targetPrice) {
    return undefined;
  }

  let orderPrice = targetPrice;
  if (rps.priceDiffPercent) {
    orderPrice = evalTargetPrice(basePointPrice, rps.priceDiffPercent, side);
  }

  const oppo: TradeOpportunity = { orderTag, side, orderPrice };
  await this.buildLimitOrder(oppo);
  return oppo;
}
