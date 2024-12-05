import {
  BacktestTradeOppo,
  BaseBacktestRunner,
} from '@/strategy-backtest/runner/base-backtest-runner';
import { ConsiderSide, LSCheckerParams } from '@/strategy/strategy.types';
import { BacktestKlineLevelsData } from '@/strategy-backtest/backtest-kline-levels-data';
import { OrderTag } from '@/db/models/ex-order';
import { TradeSide } from '@/data-service/models/base';
import { evalTargetPrice, rollAgg } from '@/strategy/opportunity/helper';
import { checkStill } from '@/strategy/opportunity/long-still';

export async function checkLongStillContinuous(
  this: BaseBacktestRunner,
  params: LSCheckerParams,
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
    if (
      (considerSide === 'both' || side === considerSide) &&
      checkStill.call(
        this,
        contrastAgg,
        latestAgg,
        amountTimes,
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

      oppo.moveOn = kld.moveOverLevel(interval);
      return oppo;
    }
    const hasNext = await kld.moveOverLevel(interval);
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
    kl = await kld.getKline();
    selfKls.push(kl);
    selfKls = selfKls.slice(1);
    contrastAgg = contrastRoller.next(selfKls[contrastPeriods]);
    latestAgg = latestRoller.next(kl);
  }
}
