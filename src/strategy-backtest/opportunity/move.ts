import {
  BacktestTradeOppo,
  BaseBacktestRunner,
} from '@/strategy-backtest/runner/base-backtest-runner';
import { ConsiderSide, MVCheckerParams } from '@/strategy/strategy.types';
import { BacktestKlineLevelsData } from '@/strategy-backtest/backtest-kline-levels-data';
import { evalTargetPrice } from '@/strategy/opportunity/helper';
import { TradeSide } from '@/data-service/models/base';

export async function checkMoveContinuous(
  this: BaseBacktestRunner,
  params: MVCheckerParams,
  oppor: Partial<BacktestTradeOppo>,
  options: {
    kld: BacktestKlineLevelsData;
    considerSide: ConsiderSide;
    tsTo?: number;
  },
): Promise<BacktestTradeOppo | undefined> {
  const { kld, considerSide, tsTo } = options;
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
        ...oppor,
        side: placeBuyOrder ? TradeSide.buy : TradeSide.sell,
        orderPrice: placeBuyOrder ? buyPrice : sellPrice,
        orderTime: new Date(kld.getIntervalEndTs()),
        moveOn: kld.moveOver(),
      };
      await this.buildMoveTpslOrder(oppo, params);
      return oppo;
    }

    if (tsTo) {
      if (kld.getCurrentTs() >= tsTo) {
        return {
          moveOn: kld.moveOver(),
          reachTimeLimit: true,
        };
      }
    }
    const moved = kld.moveOver();
    if (!moved) {
      return undefined;
    }
  }
}
