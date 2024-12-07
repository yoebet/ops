import { ExOrder, ExOrderResp } from '@/db/models/ex-order';
import { Strategy } from '@/db/models/strategy';
import { StrategyDeal } from '@/db/models/strategy-deal';
import { HumanizerOptions } from 'humanize-duration';
import { TradeSide } from '@/data-service/models/base';
import * as _ from 'lodash';
import { FeeAndSlippageRate } from '@/strategy/strategy.constants';

// for paper-trade or back-test
export function fillOrderSize(
  target: ExOrderResp,
  order: ExOrder,
  price?: number,
) {
  price = price || order.limitPrice;
  if (!price) {
    throw new Error(`missing price`);
  }
  if (FeeAndSlippageRate != null) {
    const rate =
      order.priceType === 'market'
        ? FeeAndSlippageRate
        : FeeAndSlippageRate / 2;
    if (order.side === TradeSide.buy) {
      price = price * (1 + rate);
    } else {
      price = price * (1 - rate);
    }
  }
  target.execPrice = price;
  target.execSize = order.baseSize ?? order.quoteAmount / price;
  target.execAmount = order.quoteAmount ?? order.baseSize * price;
}

export function evalOrdersPnl(orders: ExOrder[]): number | undefined {
  if (orders.length === 0) {
    return undefined;
  }
  const cal = (side: TradeSide) => {
    const sOrders = orders.filter((o) => o.side === side);
    if (sOrders.length === 0) {
      return [0, 0];
    }
    if (sOrders.length === 1) {
      return [sOrders[0].execSize, sOrders[0].execPrice];
    }
    const size = _.sumBy(sOrders, 'execSize');
    const amount = _.sumBy(sOrders, 'execAmount');
    const avgPrice = amount / size;
    return [size, avgPrice];
  };
  const [buySize, buyAvgPrice] = cal(TradeSide.buy);
  const [sellSize, sellAvgPrice] = cal(TradeSide.sell);
  if (buySize > 0 && sellSize > 0) {
    const settleSize = Math.min(buySize, sellSize);
    // .. USD
    return settleSize * (sellAvgPrice - buyAvgPrice);
  }
  return undefined;
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
