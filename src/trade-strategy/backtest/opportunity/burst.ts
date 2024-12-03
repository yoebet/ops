import { BRCheckerParams, ConsiderSide } from '@/trade-strategy/strategy.types';
import { BacktestKline } from '@/data-service/models/kline';
import {
  BacktestTradeOppo,
  BaseBacktestRunner,
} from '@/trade-strategy/backtest/runner/base-backtest-runner';
import { BacktestKlineLevelsData } from '@/trade-strategy/backtest/backtest-kline-levels-data';
import {
  evalKlineAgg,
  evalTargetPrice,
} from '@/trade-strategy/opportunity/helper';
import { BacktestKlineData } from '@/trade-strategy/backtest/backtest-kline-data';
import { checkBurst } from '@/trade-strategy/opportunity/burst';
import { TradeSide } from '@/data-service/models/base';

function rollAgg(kls: BacktestKline[]) {
  const len = kls.length;
  let agg = evalKlineAgg(kls);
  return {
    agg,
    next: (newKl: BacktestKline) => {
      const lastFirst = kls[0];
      kls.push(newKl);
      kls = kls.slice(1);
      const newFirst = kls[0];
      const amount = agg.amount - lastFirst.amount + newKl.amount;
      const size = agg.size - lastFirst.size + newKl.size;
      const avgPrice = amount / size;
      const priceChange = Math.abs(newKl.close - newFirst.open);
      const avgPriceChange = priceChange / len;
      agg = {
        size,
        amount,
        avgAmount: amount / len,
        avgPrice,
        avgPriceChange,
      };
      return agg;
    },
  };
}

export async function checkBurstContinuous(
  this: BaseBacktestRunner,
  params: BRCheckerParams,
  considerSide: ConsiderSide,
  baselineKld: BacktestKlineData,
  kld: BacktestKlineLevelsData,
  orderTag?: string,
  tsTo?: number,
): Promise<BacktestTradeOppo | undefined> {
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

  kld.resetLevel(params.interval);
  const latestFrom = periods - checkPeriods;

  let selfKls = await kld.getKlinesTillNow(interval, periods);
  let { kline: kl, hasNext } = await kld.getLowestKlineAndMoveOn();

  const ckls = selfKls.slice(0, contrastPeriods);
  const lkls = selfKls.slice(latestFrom);
  const selfContrastRoller = rollAgg(ckls);
  const selfLatestRoller = rollAgg(lkls);
  let selfContrastAgg = selfContrastRoller.agg;
  let selfLatestAgg = selfLatestRoller.agg;

  selfKls = selfKls.slice(contrastPeriods + 1);

  while (hasNext) {
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
        if (this.strategy.symbol !== baselineKld.getSymbol()) {
          const baselineKls = await baselineKld.getKlinesTillNow(
            interval,
            periods,
          );
          const blContrastAgg = evalKlineAgg(
            baselineKls.slice(0, contrastPeriods),
          );
          const blLatestAgg = evalKlineAgg(baselineKls.slice(latestFrom));
          if (
            !checkBurst.call(
              this,
              blContrastAgg,
              blLatestAgg,
              baselineAmountTimes,
              baselinePriceChangeTimes,
              'baseline',
            )
          ) {
            const lastKl = selfKls[selfKls.length - 1];
            let orderPrice: number = undefined;
            if (limitPriceDiffPercent) {
              const lastPrice = lastKl.close;
              orderPrice = evalTargetPrice(
                lastPrice,
                limitPriceDiffPercent,
                side,
              );
            }

            const oppo: BacktestTradeOppo = {
              orderTag,
              side,
              orderPrice,
              orderTime: new Date(lastKl.ts),
              moveOn: true,
            };
            await this.buildMarketOrLimitOrder(oppo);

            const nkl = await kld.getLowestKlineAndMoveOn();
            oppo.moveOn = nkl.hasNext;
            return oppo;
          }
        }
      }
    }
    const nkl = await kld.getLowestKlineAndMoveOn();
    hasNext = nkl.hasNext;
    if (!hasNext) {
      return undefined;
    }
    if (tsTo) {
      if (kld.getCurrentTimeCursor().toMillis() >= tsTo) {
        const oppo: BacktestTradeOppo = {
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
    selfContrastAgg = selfContrastRoller.next(selfKls[0]);
    selfKls = selfKls.slice(1);
    selfLatestAgg = selfLatestRoller.next(kl);
  }

  return undefined;
}
