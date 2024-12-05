import { ExOrder, ExOrderResp } from '@/db/models/ex-order';
import { Strategy } from '@/db/models/strategy';
import { StrategyDeal } from '@/db/models/strategy-deal';
import { HumanizerOptions } from 'humanize-duration';

export function fillOrderSize(
  target: ExOrderResp,
  order: ExOrder,
  price?: number,
) {
  price = price || order.limitPrice;
  const execSize = order.baseSize ? order.baseSize : order.quoteAmount / price;
  const execAmount = order.quoteAmount
    ? order.quoteAmount
    : order.baseSize * price;
  target.execPrice = price;
  target.execSize = execSize;
  target.execAmount = execAmount;
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

export const durationHumanizerOptions: HumanizerOptions = {
  language: 'shortEn',
  delimiter: ' ',
  spacer: '',
  languages: {
    shortEn: {
      y: () => 'y',
      mo: () => 'mo',
      w: () => 'w',
      d: () => 'd',
      h: () => 'h',
      m: () => 'm',
      s: () => 's',
      ms: () => 'ms',
    },
  },
};
