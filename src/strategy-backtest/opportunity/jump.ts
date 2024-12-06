import {
  BacktestTradeOppo,
  BaseBacktestRunner,
} from '@/strategy-backtest/runner/base-backtest-runner';
import { ConsiderSide, JumpCheckerParams } from '@/strategy/strategy.types';
import { BacktestKlineLevelsData } from '@/strategy-backtest/backtest-kline-levels-data';
import { TradeSide } from '@/data-service/models/base';
import { evalTargetPrice, rollAgg } from '@/strategy/opportunity/helper';
import { checkJump } from '@/strategy/opportunity/jump';

export async function checkJumpContinuous(
  this: BaseBacktestRunner,
  params: JumpCheckerParams,
  oppor: Partial<BacktestTradeOppo>,
  options: {
    kld: BacktestKlineLevelsData;
    considerSide: ConsiderSide;
    tsTo?: number;
  },
): Promise<BacktestTradeOppo | undefined> {
  const { kld, considerSide, tsTo } = options;
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
  if (selfKls.length < periods) {
    return undefined;
  }
  let kl = await kld.getKline();

  let jumpKlines = selfKls.slice(0, jumpPeriods);
  let stopKlines = selfKls.slice(jumpPeriods);
  const contrastRoller = rollAgg(jumpKlines);
  const latestRoller = rollAgg(stopKlines);
  let contrastAgg = contrastRoller.agg;
  let latestAgg = latestRoller.agg;

  while (true) {
    const side =
      latestAgg.avgPrice > contrastAgg.avgPrice
        ? TradeSide.buy
        : TradeSide.sell;

    const info: string[] = [];
    if (considerSide === 'both' || side === considerSide) {
      if (
        checkJump.call(
          this,
          jumpKlines,
          stopKlines,
          contrastAgg,
          latestAgg,
          priceChangeTimes,
          info,
        )
      ) {
        const lastKl = selfKls[selfKls.length - 1];
        let orderPrice = lastKl.close;
        if (limitPriceDiffPercent) {
          orderPrice = evalTargetPrice(orderPrice, limitPriceDiffPercent, side);
        }

        const oppo: BacktestTradeOppo = {
          ...oppor,
          side,
          orderPrice,
          orderTime: new Date(kld.getIntervalEndTs()),
          moveOn: kld.moveOverLevel(interval),
          memo: info.join('\n'),
        };
        await this.buildMarketOrder(oppo);
        return oppo;
      }
    }
    const hasNext = kld.moveOverLevel(interval);
    if (!hasNext) {
      return undefined;
    }
    if (tsTo) {
      if (kld.getCurrentTs() >= tsTo) {
        return {
          ...oppor,
          side,
          // orderPrice,
          // orderTime: new Date(lastKl.ts),
          moveOn: kld.moveOver(),
          reachTimeLimit: true,
        };
      }
    }
    kl = await kld.getKline();
    selfKls.push(kl);
    selfKls = selfKls.slice(1);
    jumpKlines = selfKls.slice(0, jumpPeriods);
    stopKlines = selfKls.slice(jumpPeriods);
    contrastAgg = contrastRoller.next(selfKls[jumpPeriods]);
    latestAgg = latestRoller.next(kl);
  }
}
