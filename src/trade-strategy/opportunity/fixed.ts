import {
  evalTargetPrice,
  setPlaceOrderPrice,
  waitForPrice,
} from '@/trade-strategy/opportunity/helper';
import {
  PriceDiffRuntimeParams,
  TradeOpportunity,
} from '@/trade-strategy/strategy.types';
import { TradeSide } from '@/data-service/models/base';
import { BaseRunner } from '@/trade-strategy/strategy/base-runner';

export async function waitToPlaceOrder(
  this: BaseRunner,
  rps: PriceDiffRuntimeParams,
  side: TradeSide,
  orderTag?: string,
): Promise<TradeOpportunity | undefined> {
  if (!rps.startingPrice) {
    rps.startingPrice = await this.env.getLastPrice();
  }
  if (!rps.basePointPrice) {
    if (rps.waitForPercent) {
      await setPlaceOrderPrice.call(this, rps, side);
    } else {
      rps.basePointPrice = rps.startingPrice;
    }
  }
  const targetPrice = await waitForPrice.call(this, side, rps.basePointPrice);
  if (!targetPrice) {
    return undefined;
  }
  let limitPrice = rps.basePointPrice;
  if (rps.priceDiffPercent) {
    limitPrice = evalTargetPrice(
      rps.basePointPrice,
      rps.priceDiffPercent,
      side,
    );
  }

  return { orderTag, side, orderPrice: limitPrice };
}
