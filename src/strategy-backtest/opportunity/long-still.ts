import {
  BacktestTradeOppo,
  BaseBacktestRunner,
  CheckOppoOptions,
} from '@/strategy-backtest/runner/base-backtest-runner';
import { LSCheckerParams } from '@/strategy/strategy.types';
import { TradeSide } from '@/data-service/models/base';
import { evalTargetPrice, rollAgg } from '@/strategy/opportunity/helper';
import { checkStill } from '@/strategy/opportunity/long-still';
import { OrderTag } from '@/db/models/ex-order';

export async function checkLongStillContinuous(
  this: BaseBacktestRunner,
  params: LSCheckerParams,
  oppor: Partial<BacktestTradeOppo>,
  options: CheckOppoOptions,
): Promise<BacktestTradeOppo | undefined> {
  const { kld, considerSide, tsTo, stopLossPrice, closeSide } = options;
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

    const intervalEndTs = kld.getIntervalEndTs();
    if (stopLossPrice && stopLossPrice >= kl.low && stopLossPrice <= kl.high) {
      if (kld.moveDownLevel()) {
        continue;
      }
      const oppo: BacktestTradeOppo = {
        ...oppor,
        side: closeSide,
        orderTag: OrderTag.stoploss,
        orderPrice: stopLossPrice,
        orderTime: new Date(intervalEndTs),
        reachStopLossPrice: true,
      };
      await this.buildMarketOrder(oppo);
      return oppo;
    }

    if (tsTo && intervalEndTs >= tsTo) {
      return {
        ...oppor,
        side: closeSide,
        orderTag: OrderTag.forceclose,
        orderPrice: kl.close,
        orderTime: new Date(intervalEndTs),
        reachTimeLimit: true,
      };
    }

    const hasNext = await kld.moveOverLevel(interval);
    if (!hasNext) {
      return undefined;
    }
    kl = await kld.getKline();
    selfKls.push(kl);
    selfKls = selfKls.slice(1);
    contrastAgg = contrastRoller.next(selfKls[contrastPeriods]);
    latestAgg = latestRoller.next(kl);
  }
}
