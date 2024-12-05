import {
  BacktestTradeOppo,
  BaseBacktestRunner,
} from '@/strategy-backtest/runner/base-backtest-runner';
import { ConsiderSide, JumpCheckerParams } from '@/strategy/strategy.types';
import { BacktestKlineLevelsData } from '@/strategy-backtest/backtest-kline-levels-data';
import { OrderTag } from '@/db/models/ex-order';
import { TradeSide } from '@/data-service/models/base';
import { evalTargetPrice, rollAgg } from '@/strategy/opportunity/helper';
import { checkJump } from '@/strategy/opportunity/jump';

export async function checkJumpContinuous(
  this: BaseBacktestRunner,
  params: JumpCheckerParams,
  options: {
    kld: BacktestKlineLevelsData;
    considerSide: ConsiderSide;
    orderTag?: OrderTag;
    tsTo?: number;
  },
): Promise<BacktestTradeOppo | undefined> {
  const { kld, considerSide, orderTag, tsTo } = options;
  const {
    interval,
    jumpPeriods,
    stopPeriods,
    priceChangeTimes,
    limitPriceDiffPercent,
  } = params;

  kld.resetLevel(interval);
  const periods = jumpPeriods + stopPeriods;
  let selfKls = await kld.getKlinesTillNow(interval, periods);
  let kl = await kld.getKline();

  let jumpKlines = selfKls.slice(0, jumpPeriods);
  let stopKlines = selfKls.slice(jumpPeriods);
  const contrastRoller = rollAgg(jumpKlines);
  const latestRoller = rollAgg(stopKlines);
  let contrastAgg = contrastRoller.agg;
  let latestAgg = latestRoller.agg;

  let hasNext = true;
  while (hasNext) {
    const side =
      latestAgg.avgPrice > contrastAgg.avgPrice
        ? TradeSide.buy
        : TradeSide.sell;

    if (considerSide === 'both' || side === considerSide) {
      if (
        checkJump.call(
          this,
          jumpKlines,
          stopKlines,
          contrastAgg,
          latestAgg,
          priceChangeTimes,
        )
      ) {
        const lastKl = selfKls[selfKls.length - 1];
        let orderPrice = lastKl.close;
        if (limitPriceDiffPercent) {
          orderPrice = evalTargetPrice(orderPrice, limitPriceDiffPercent, side);
        }

        const oppo: BacktestTradeOppo = {
          orderTag,
          side,
          orderPrice,
          orderTime: new Date(kld.getIntervalEndTs()),
          moveOn: true,
        };
        await this.buildMarketOrLimitOrder(oppo);

        const nkl = await kld.getKlineAndMoveOn(interval);
        oppo.moveOn = nkl.hasNext;
        return oppo;
      }
    }
    const nkl = await kld.getKlineAndMoveOn(interval);
    hasNext = nkl.hasNext;
    if (!hasNext) {
      return undefined;
    }
    if (tsTo) {
      if (kld.getCurrentTs() >= tsTo) {
        return {
          orderTag,
          side,
          // orderPrice,
          // orderTime: new Date(lastKl.ts),
          moveOn: true,
          reachTimeLimit: true,
        };
      }
    }
    kl = nkl.kline;
    selfKls.push(kl);
    selfKls = selfKls.slice(1);
    jumpKlines = selfKls.slice(0, jumpPeriods);
    stopKlines = selfKls.slice(jumpPeriods);
    contrastAgg = contrastRoller.next(selfKls[jumpPeriods]);
    latestAgg = latestRoller.next(kl);
  }

  return undefined;
}
