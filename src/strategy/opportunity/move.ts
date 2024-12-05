import {
  ConsiderSide,
  MVCheckerParams,
  TradeOpportunity,
} from '@/strategy/strategy.types';
import { TradeSide } from '@/data-service/models/base';
import { BaseRunner } from '@/strategy/strategy/base-runner';
import { evalTargetPrice, waitForPrice } from '@/strategy/opportunity/helper';
import { OrderTag } from '@/db/models/ex-order';

export async function checkMVOpp(
  this: BaseRunner,
  rtParams: MVCheckerParams,
  side: ConsiderSide,
  orderTag?: string,
): Promise<TradeOpportunity | undefined> {
  if (side !== 'both') {
    return checkMVOneSide.call(this, rtParams, side, orderTag);
  }
  return Promise.race([
    checkMVOneSide.call(this, { ...rtParams }, TradeSide.buy, orderTag),
    checkMVOneSide.call(this, { ...rtParams }, TradeSide.sell, orderTag),
  ]);
}

async function checkMVOneSide(
  this: BaseRunner,
  rtParams: MVCheckerParams,
  side: TradeSide,
  orderTag?: OrderTag,
): Promise<TradeOpportunity | undefined> {
  let basePointPrice: number;
  const { startingPrice, waitForPercent } = rtParams;
  if (startingPrice && waitForPercent) {
    basePointPrice = evalTargetPrice(startingPrice, waitForPercent, side);
    await this.logJob(`target-price: ${basePointPrice.toPrecision(6)}`);

    const targetPrice = await waitForPrice.call(this, side, basePointPrice);
    if (!targetPrice) {
      return undefined;
    }
  }

  const oppo: TradeOpportunity = { orderTag, side, orderPrice: basePointPrice };
  await this.buildMoveTpslOrder(oppo, rtParams);
  return oppo;
}
