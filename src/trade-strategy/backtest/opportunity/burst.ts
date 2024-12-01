import { BRCheckerParams, ConsiderSide } from '@/trade-strategy/strategy.types';
import { BacktestKline, Kline } from '@/data-service/models/kline';
import {
  BacktestTradeOpportunity,
  BaseBacktestRunner,
} from '@/trade-strategy/backtest/runner/base-backtest-runner';
import { BacktestKlineLevelsData } from '@/trade-strategy/backtest/backtest-kline-levels-data';
import { BaseRunner } from '@/trade-strategy/strategy/base-runner';
import { KlineAgg } from '@/trade-strategy/opportunity/helper';

function checkBurst(
  this: BaseRunner,
  contrastAgg: KlineAgg,
  latestAgg: KlineAgg,
  amountTimes: number,
  priceChangeTimes: number,
  context?: string,
): boolean {
  const laa = latestAgg.avgAmount;
  const caa = contrastAgg.avgAmount;
  const lpc = latestAgg.avgPriceChange;
  const cpc = contrastAgg.avgPriceChange;
  if (!laa || !caa || !lpc || !cpc) {
    return false;
  }
  this.logger.debug(
    `[${context}] avgAmount: ${laa.toFixed(0)} ~ ${caa.toFixed(0)}, times: ${(laa / caa).toFixed(2)} ~ ${amountTimes}`,
  );
  this.logger.debug(
    `[${context}] priceChange: ${lpc.toPrecision(6)} ~ ${cpc.toPrecision(6)}, times: ${(lpc / cpc).toFixed(2)} ~ ${priceChangeTimes}`,
  );
  return laa >= caa * amountTimes && lpc >= cpc * priceChangeTimes;
}

export async function checkBurstInTimespan(
  this: BaseBacktestRunner,
  params: BRCheckerParams,
  considerSide: ConsiderSide,
  kld: BacktestKlineLevelsData,
  orderTag?: string,
  tsTo?: number,
): Promise<BacktestTradeOpportunity | undefined> {
  kld.resetLevel(params.interval);
  while (true) {
    const kls = await kld.getKlinesTillNow(params.interval, params.periods);

    const { kline: kl, hasNext } = await kld.getLowestKlineAndMoveOn();
    const { timeCursor, interval } = kld.getCurrentLevel();
    if (!hasNext) {
      break;
    }
  }

  return undefined;
}
