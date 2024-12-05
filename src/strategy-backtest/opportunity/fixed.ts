import {
  BacktestTradeOppo,
  BaseBacktestRunner,
} from '@/strategy-backtest/runner/base-backtest-runner';
import { ConsiderSide, PriceDiffParams } from '@/strategy/strategy.types';
import { BacktestKlineLevelsData } from '@/strategy-backtest/backtest-kline-levels-data';
import { OrderTag } from '@/db/models/ex-order';
import { evalTargetPrice } from '@/strategy/opportunity/helper';
import { TradeSide } from '@/data-service/models/base';

export async function checkLimitOrderContinuous(
  this: BaseBacktestRunner,
  params: PriceDiffParams,
  options: {
    kld: BacktestKlineLevelsData;
    considerSide: ConsiderSide;
    orderTag?: OrderTag;
    tsTo?: number;
  },
): Promise<BacktestTradeOppo | undefined> {
  const { kld, considerSide, orderTag, tsTo } = options;
  const { waitForPercent } = params;

  const couldBuy = considerSide === 'both' || considerSide === 'buy';
  const couldSell = considerSide === 'both' || considerSide === 'sell';

  let buyPrice: number;
  let sellPrice: number;
  let placeBuyOrder = false;
  let placeSellOrder = false;

  while (true) {
    const kl = await kld.getKline();
    if (!kl) {
      const moved = kld.moveOn();
      if (moved) {
        continue;
      } else {
        return undefined;
      }
    }

    if (couldBuy) {
      if (!buyPrice) {
        buyPrice = kl.open;
        if (waitForPercent) {
          buyPrice = evalTargetPrice(buyPrice, waitForPercent, TradeSide.buy);
        }
      }
      if (buyPrice >= kl.low && buyPrice <= kl.high) {
        if (kld.moveDownLevel()) {
          continue;
        }
        placeBuyOrder = true;
      }
    }
    if (couldSell) {
      if (!sellPrice) {
        sellPrice = kl.open;
        if (waitForPercent) {
          sellPrice = evalTargetPrice(
            sellPrice,
            waitForPercent,
            TradeSide.sell,
          );
        }
      }
      if (sellPrice >= kl.low && sellPrice <= kl.high) {
        if (kld.moveDownLevel()) {
          continue;
        }
        placeSellOrder = true;
      }
    }

    if (placeBuyOrder || placeSellOrder) {
      const oppo: BacktestTradeOppo = {
        orderTag,
        side: placeBuyOrder ? TradeSide.buy : TradeSide.sell,
        orderPrice: placeBuyOrder ? buyPrice : sellPrice,
        orderTime: new Date(kld.getIntervalEndTs()),
        moveOn: true,
      };
      await this.buildLimitOrder(oppo);
      return oppo;
    }

    if (tsTo) {
      if (kld.getCurrentTs() >= tsTo) {
        return {
          orderTag,
          moveOn: true,
          reachTimeLimit: true,
        };
      }
    }
    const moved = kld.moveOver();
    if (!moved) {
      return {
        moveOn: false,
      };
    }
  }
}
