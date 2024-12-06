import { evalTargetPrice, waitForPrice } from '@/strategy/opportunity/helper';
import {
  ConsiderSide,
  TpslParams,
  TradeOpportunity,
} from '@/strategy/strategy.types';
import { TradeSide } from '@/data-service/models/base';
import { BaseRunner } from '@/strategy/strategy/base-runner';

export async function waitToPlaceLimitOrder(
  this: BaseRunner,
  rps: TpslParams,
  side: ConsiderSide,
  oppor?: Partial<TradeOpportunity>,
): Promise<TradeOpportunity | undefined> {
  if (!rps.startingPrice) {
    rps.startingPrice = await this.env.getLastPrice();
  }

  if (side === 'both') {
    return Promise.race([
      waitToPlaceOrderOneSide.call(this, rps, TradeSide.buy, oppor),
      waitToPlaceOrderOneSide.call(this, rps, TradeSide.sell, oppor),
    ]);
  } else {
    return waitToPlaceOrderOneSide.call(this, rps, side, oppor);
  }
}

async function waitToPlaceOrderOneSide(
  this: BaseRunner,
  rps: TpslParams,
  side: TradeSide,
  oppor?: Partial<TradeOpportunity>,
): Promise<TradeOpportunity | undefined> {
  let basePointPrice = rps.startingPrice;
  if (rps.waitForPercent) {
    const wfp = rps.waitForPercent;
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

  const oppo: TradeOpportunity = { ...oppor, side, orderPrice };
  await this.buildLimitOrder(oppo);
  return oppo;
}
