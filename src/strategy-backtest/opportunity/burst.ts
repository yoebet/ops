import { BRCheckerParams } from '@/strategy/strategy.types';
import {
  BacktestTradeOppo,
  BaseBacktestRunner,
  CheckOppoOptions,
} from '@/strategy-backtest/runner/base-backtest-runner';
import {
  evalKlineAgg,
  evalTargetPrice,
  rollAgg,
} from '@/strategy/opportunity/helper';
import { BacktestKlineData } from '@/strategy-backtest/backtest-kline-data';
import { checkBurst } from '@/strategy/opportunity/burst';
import { TradeSide } from '@/data-service/models/base';
import { checkStopLossAndTimeLimit } from '@/strategy-backtest/opportunity/helper';

export async function checkBurstContinuous(
  this: BaseBacktestRunner,
  params: BRCheckerParams,
  baselineKld: BacktestKlineData,
  oppor: Partial<BacktestTradeOppo>,
  options: CheckOppoOptions,
): Promise<BacktestTradeOppo | undefined> {
  const { kld, considerSide } = options;
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
  if (!kl) {
    return undefined;
  }

  const ckls = selfKls.slice(0, contrastPeriods);
  const lkls = selfKls.slice(latestFrom);
  const selfContrastRoller = rollAgg(ckls);
  const selfLatestRoller = rollAgg(lkls);
  let selfContrastAgg = selfContrastRoller.agg;
  let selfLatestAgg = selfLatestRoller.agg;

  while (true) {
    const info: string[] = [];

    // this.logger.log(`${kl.interval} ${kl.time.toISOString()}`);
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
          info,
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
            info,
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

          const intervalEndTs = kld.getIntervalEndTs();
          const oppo: BacktestTradeOppo = {
            ...oppor,
            side,
            orderPrice,
            orderTime: new Date(intervalEndTs),
            memo: info.join('\n'),
          };
          await this.buildMarketOrder(oppo);
          return oppo;
        }
      }
    }

    const oppo = await checkStopLossAndTimeLimit.call(this, kl, oppor, options);
    if (oppo) {
      return oppo;
    }

    const hasNext = kld.moveOverLevel(interval);
    if (!hasNext) {
      return undefined;
    }
    kl = await kld.getKline();
    if (!kl) {
      return undefined;
    }
    selfKls.push(kl);
    selfKls = selfKls.slice(1);
    selfContrastAgg = selfContrastRoller.next(selfKls[contrastPeriods]);
    selfLatestAgg = selfLatestRoller.next(kl);
  }
}
