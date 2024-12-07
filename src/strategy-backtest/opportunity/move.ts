import {
  BacktestTradeOppo,
  BaseBacktestRunner,
  CheckOppoOptions,
} from '@/strategy-backtest/runner/base-backtest-runner';
import { MVCheckerParams } from '@/strategy/strategy.types';
import { evalTargetPrice } from '@/strategy/opportunity/helper';
import { TradeSide } from '@/data-service/models/base';
import { checkStopLossAndTimeLimit } from '@/strategy-backtest/opportunity/helper';

export async function checkMoveContinuous(
  this: BaseBacktestRunner,
  params: MVCheckerParams,
  oppor: Partial<BacktestTradeOppo>,
  options: CheckOppoOptions,
): Promise<BacktestTradeOppo | undefined> {
  const { kld, considerSide } = options;
  const { waitForPercent } = params;

  const bothSide = considerSide === 'both';
  const couldBuy = bothSide || considerSide === 'buy';
  const couldSell = bothSide || considerSide === 'sell';

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
      const intervalEndTs = kld.getIntervalEndTs();
      const oppo: BacktestTradeOppo = {
        ...oppor,
        side: placeBuyOrder ? TradeSide.buy : TradeSide.sell,
        orderPrice: placeBuyOrder ? buyPrice : sellPrice,
        orderTime: new Date(intervalEndTs),
      };
      await this.buildMoveTpslOrder(oppo, params);
      return oppo;
    }

    const oppo = await checkStopLossAndTimeLimit.call(kl, oppor, options);
    if (oppo) {
      return oppo;
    }

    const moved = kld.moveOver();
    if (!moved) {
      return undefined;
    }
  }
}
