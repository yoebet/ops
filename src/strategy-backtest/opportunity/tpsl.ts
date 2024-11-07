import {
  BacktestTradeOppo,
  BaseBacktestRunner,
  CheckOppoOptions,
} from '@/strategy-backtest/runner/base-backtest-runner';
import { TpslParams } from '@/strategy/strategy.types';
import { evalTargetPrice } from '@/strategy/opportunity/helper';
import { TradeSide } from '@/data-service/models/base';
import { checkStopLossAndTimeLimit } from '@/strategy-backtest/opportunity/helper';

export async function checkLimitOrderContinuous(
  this: BaseBacktestRunner,
  params: TpslParams,
  oppor: Partial<BacktestTradeOppo>,
  options: CheckOppoOptions,
): Promise<BacktestTradeOppo | undefined> {
  const { kld, considerSide } = options;
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
      const intervalEndTs = kld.getIntervalEndTs();
      const oppo: BacktestTradeOppo = {
        ...oppor,
        side: placeBuyOrder ? TradeSide.buy : TradeSide.sell,
        orderPrice: placeBuyOrder ? buyPrice : sellPrice,
        orderTime: new Date(intervalEndTs),
      };
      await this.buildLimitOrder(oppo);
      return oppo;
    }

    const oppo = await checkStopLossAndTimeLimit.call(this, kl, oppor, options);
    if (oppo) {
      return oppo;
    }

    const moved = kld.moveOver();
    if (!moved) {
      return undefined;
    }
  }
}
