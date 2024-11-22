import { ExOrderResp } from '@/db/models/ex-order';
import { PlaceOrderParams } from '@/exchange/exchange-service-types';
import { Strategy } from '@/db/models/strategy';
import { StrategyDeal } from '@/db/models/strategy-deal';

export function fillOrderSize(
  order: ExOrderResp,
  params: PlaceOrderParams,
  price?: number,
) {
  price = price || +params.price;
  const execSize = params.baseSize
    ? +params.baseSize
    : +params.quoteAmount / price;
  const execAmount = params.quoteAmount
    ? +params.quoteAmount
    : +params.baseSize * price;
  order.execPrice = price;
  order.execSize = execSize;
  order.execAmount = execAmount;
}

export async function createNewDealIfNone(strategy: Strategy) {
  if (strategy.currentDealId) {
    return;
  }
  const currentDeal = StrategyDeal.newStrategyDeal(strategy);
  await currentDeal.save();
  strategy.currentDealId = currentDeal.id;
  strategy.currentDeal = currentDeal;
  await strategy.save();
}
