import {
  BacktestTradeOppo,
  BaseBacktestRunner,
  CheckOppoOptions,
} from '@/strategy-backtest/runner/base-backtest-runner';
import { LSCheckerParams } from '@/strategy/strategy.types';
import { TradeSide } from '@/data-service/models/base';
import { evalTargetPrice, rollAgg } from '@/strategy/opportunity/helper';
import { checkStill } from '@/strategy/opportunity/long-still';
import { checkStopLossAndTimeLimit } from '@/strategy-backtest/opportunity/helper';

export async function checkLongStillContinuous(
  this: BaseBacktestRunner,
  params: LSCheckerParams,
  oppor: Partial<BacktestTradeOppo>,
  options: CheckOppoOptions,
): Promise<BacktestTradeOppo | undefined> {
  const { kld, considerSide } = options;
  const {
    interval,
    periods,
    checkPeriods,
    contrastPeriods,
    amountTimes,
    priceChangeTimes,
    limitPriceDiffPercent,
  } = params;

  const latestFrom = periods - checkPeriods;

  kld.resetLevel(interval);
  let selfKls = await kld.getKlinesTillNow(interval, periods);
  if (selfKls.length < periods) {
    return undefined;
  }
  let kl = await kld.getKline();
  if (!kl) {
    return undefined;
  }

  const ckls = selfKls.slice(0, contrastPeriods);
  const lkls = selfKls.slice(latestFrom);
  const contrastRoller = rollAgg(ckls);
  const latestRoller = rollAgg(lkls);
  let contrastAgg = contrastRoller.agg;
  let latestAgg = latestRoller.agg;

  while (true) {
    const side =
      latestAgg.avgPrice > contrastAgg.avgPrice
        ? TradeSide.buy
        : TradeSide.sell;
    const info: string[] = [];
    if (
      (considerSide === 'both' || side === considerSide) &&
      checkStill.call(
        this,
        contrastAgg,
        latestAgg,
        amountTimes,
        priceChangeTimes,
        info,
      )
    ) {
      const lastKl = selfKls[selfKls.length - 1];
      let orderPrice = lastKl.close;
      if (limitPriceDiffPercent) {
        orderPrice = evalTargetPrice(orderPrice, limitPriceDiffPercent, side);
      }

      const intervalEndTs = kld.getIntervalEndTs();
      const oppo: BacktestTradeOppo = {
        ...oppor,
        side,
        orderPrice,
        orderTime: new Date(intervalEndTs),
        moveOn: kld.moveOverLevel(interval),
        memo: info.join('\n'),
      };
      await this.buildMarketOrder(oppo);
      return oppo;
    }

    const oppo = await checkStopLossAndTimeLimit.call(this, kl, oppor, options);
    if (oppo) {
      return oppo;
    }

    const hasNext = await kld.moveOverLevel(interval);
    if (!hasNext) {
      return undefined;
    }
    kl = await kld.getKline();
    if (!kl) {
      return undefined;
    }
    selfKls.push(kl);
    selfKls = selfKls.slice(1);
    contrastAgg = contrastRoller.next(selfKls[contrastPeriods]);
    latestAgg = latestRoller.next(kl);
  }
}
