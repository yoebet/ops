import { BRCheckerParams, ConsiderSide } from '@/strategy/strategy.types';
import {
  BacktestTradeOppo,
  BaseBacktestRunner,
} from '@/strategy-backtest/runner/base-backtest-runner';
import { BacktestKlineLevelsData } from '@/strategy-backtest/backtest-kline-levels-data';
import {
  evalKlineAgg,
  evalTargetPrice,
  rollAgg,
} from '@/strategy/opportunity/helper';
import { BacktestKlineData } from '@/strategy-backtest/backtest-kline-data';
import { checkBurst } from '@/strategy/opportunity/burst';
import { TradeSide } from '@/data-service/models/base';
import { OrderTag } from '@/db/models/ex-order';

export async function checkBurstContinuous(
  this: BaseBacktestRunner,
  params: BRCheckerParams,
  baselineKld: BacktestKlineData,
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
    baselineAmountTimes,
    baselinePriceChangeTimes,
    selfAmountTimes,
    selfPriceChangeTimes,
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
  const selfContrastRoller = rollAgg(ckls);
  const selfLatestRoller = rollAgg(lkls);
  let selfContrastAgg = selfContrastRoller.agg;
  let selfLatestAgg = selfLatestRoller.agg;

  while (true) {
    this.logger.log(`${kl.interval} ${kl.time.toISOString()}`);
    const side =
      selfLatestAgg.avgPrice > selfContrastAgg.avgPrice
        ? TradeSide.buy
        : TradeSide.sell;
    if (considerSide === 'both' || side === considerSide) {
      if (
        checkBurst.call(
          this,
          selfContrastAgg,
          selfLatestAgg,
          selfAmountTimes,
          selfPriceChangeTimes,
          'self',
        )
      ) {
        let match = false;
        if (this.strategy.symbol !== baselineKld.getSymbol()) {
          match = true;
        } else {
          const baselineKls = await baselineKld.getKlinesTillNow(
            interval,
            periods,
          );
          const bckls = baselineKls.slice(0, contrastPeriods);
          const blkls = baselineKls.slice(latestFrom);
          const blContrastAgg = evalKlineAgg(bckls);
          const blLatestAgg = evalKlineAgg(blkls);
          match = !checkBurst.call(
            this,
            blContrastAgg,
            blLatestAgg,
            baselineAmountTimes,
            baselinePriceChangeTimes,
            'baseline',
          );
        }
        if (match) {
          const lastKl = selfKls[selfKls.length - 1];
          let orderPrice = lastKl.close;
          if (limitPriceDiffPercent) {
            orderPrice = evalTargetPrice(
              orderPrice,
              limitPriceDiffPercent,
              side,
            );
          }

          const oppo: BacktestTradeOppo = {
            orderTag,
            side,
            orderPrice,
            orderTime: new Date(kld.getIntervalEndTs()),
            moveOn: true,
          };
          await this.buildMarketOrder(oppo);

          oppo.moveOn = kld.moveOverLevel(interval);
          return oppo;
        }
      }
    }
    const hasNext = kld.moveOverLevel(interval);
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
    selfContrastAgg = selfContrastRoller.next(selfKls[contrastPeriods]);
    selfLatestAgg = selfLatestRoller.next(kl);
  }
}
