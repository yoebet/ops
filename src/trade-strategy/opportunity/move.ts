import {
  MVRuntimeParams,
  TradeOpportunity,
} from '@/trade-strategy/strategy.types';
import { TradeSide } from '@/data-service/models/base';
import { BaseRunner } from '@/trade-strategy/strategy/base-runner';
import { waitForPrice } from '@/trade-strategy/opportunity/helper';

export async function checkMVOpportunity(
  this: BaseRunner,
  params: MVRuntimeParams,
  side: TradeSide,
  orderTag?: string,
): Promise<TradeOpportunity | undefined> {
  const targetPrice = await waitForPrice.call(this, side, params.orderPrice);
  if (!targetPrice) {
    return undefined;
  }
  return { orderTag, side, orderPrice: targetPrice };
}
