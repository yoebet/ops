import {
  ConsiderSide,
  MVCheckerParams,
  TradeOpportunity,
} from '@/strategy/strategy.types';
import { TradeSide } from '@/data-service/models/base';
import { BaseRunner } from '@/strategy/strategy/base-runner';
import { evalTargetPrice, waitForPrice } from '@/strategy/opportunity/helper';

export async function checkMVOpp(
  this: BaseRunner,
  rtParams: MVCheckerParams,
  side: ConsiderSide,
  oppor?: Partial<TradeOpportunity>,
): Promise<TradeOpportunity | undefined> {
  if (side !== 'both') {
    return checkMVOneSide.call(this, rtParams, side, oppor);
  }
  return Promise.race([
    checkMVOneSide.call(this, { ...rtParams }, TradeSide.buy, oppor),
    checkMVOneSide.call(this, { ...rtParams }, TradeSide.sell, oppor),
  ]);
}

async function checkMVOneSide(
  this: BaseRunner,
  rtParams: MVCheckerParams,
  side: TradeSide,
  oppor?: Partial<TradeOpportunity>,
): Promise<TradeOpportunity | undefined> {
  const { startingPrice, waitForPercent } = rtParams;
  let basePointPrice = startingPrice;
  if (!basePointPrice) {
    basePointPrice = await this.env.getLastPrice();
  }
  if (waitForPercent) {
    basePointPrice = evalTargetPrice(basePointPrice, waitForPercent, side);
    await this.logJob(`target-price: ${basePointPrice.toPrecision(6)}`);

    const targetPrice = await waitForPrice.call(this, side, basePointPrice);
    if (!targetPrice) {
      return undefined;
    }
  }

  const oppo: TradeOpportunity = { ...oppor, side, orderPrice: basePointPrice };
  await this.buildMoveTpslOrder(oppo, rtParams);
  return oppo;
}
