import {
  ConsiderSide,
  JumpCheckerParams,
  TradeOpportunity,
} from '@/strategy/strategy.types';
import { TimeLevel } from '@/db/models/time-level';
import { wait } from '@/common/utils/utils';
import { TradeSide } from '@/data-service/models/base';
import { BaseRunner } from '@/strategy/strategy/base-runner';
import {
  evalKlineAgg,
  evalTargetPrice,
  KlineAgg,
} from '@/strategy/opportunity/helper';
import { ExKline } from '@/exchange/exchange-service.types';
import { AppLogger } from '@/common/app-logger';
import { OrderTag } from '@/db/models/ex-order';

export function checkJump(
  this: { logger: AppLogger },
  jumpKlines: ExKline[],
  stopKlines: ExKline[],
  contrastAgg: KlineAgg,
  latestAgg: KlineAgg,
  priceChangeTimes: number,
  info: string[],
): boolean {
  const jl = jumpKlines.length;
  const jumpLast = jumpKlines[jl - 1];
  const jumpSecondToLast = jumpKlines[jl - 2];
  if (jumpLast.low >= jumpSecondToLast.low) {
    return false;
  }
  for (const k of stopKlines) {
    if (k.low < jumpLast.low) {
      return false;
    }
  }
  const lpc = latestAgg.avgPriceChange;
  const cpc = contrastAgg.avgPriceChange;
  if (!lpc || !cpc) {
    return false;
  }
  const lpcs = lpc.toPrecision(6);
  const cpcs = lpc.toPrecision(6);
  const times = (lpc / cpc).toFixed(2);
  const m = `priceChange: ${lpcs} ~ ${cpcs}, times: ${times} ~ ${priceChangeTimes}`;
  info.push(m);
  this.logger.debug(m);
  return lpc >= cpc * priceChangeTimes;
}

export async function checkJumpOpp(
  this: BaseRunner,
  params: JumpCheckerParams,
  considerSide: ConsiderSide,
  orderTag?: OrderTag,
): Promise<TradeOpportunity | undefined> {
  const { interval, jumpPeriods, stopPeriods, priceChangeTimes } = params;

  const intervalSeconds = TimeLevel.evalIntervalSeconds(interval);

  const periods = jumpPeriods + stopPeriods;
  const selfKls = await this.env.getLatestKlines({
    interval,
    limit: periods,
  });
  const jumpKlines = selfKls.slice(0, jumpPeriods);
  const stopKlines = selfKls.slice(jumpPeriods);
  const jumpAgg = evalKlineAgg(jumpKlines);
  const stopAgg = evalKlineAgg(stopKlines);

  const side =
    stopAgg.avgPrice < jumpAgg.avgPrice ? TradeSide.buy : TradeSide.sell;
  if (considerSide !== 'both' && side !== considerSide) {
    await this.logJob(`not the side, wait ${interval}`);
    await wait(intervalSeconds * 1000);
    return undefined;
  }
  const info: string[] = [];
  if (
    !checkJump.call(
      this,
      jumpKlines,
      stopKlines,
      jumpAgg,
      stopAgg,
      priceChangeTimes,
      info,
    )
  ) {
    const waitPeriods = 0.5;
    await this.logJob(`quiet, wait ${waitPeriods}*${interval}`);
    await wait(waitPeriods * intervalSeconds * 1000);
    return undefined;
  }

  let orderPrice: number = undefined;
  if (params.limitPriceDiffPercent) {
    const lastPrice = await this.env.getLastPrice();
    orderPrice = evalTargetPrice(lastPrice, params.limitPriceDiffPercent, side);
  }

  const oppo: TradeOpportunity = {
    orderTag,
    side,
    orderPrice,
    memo: info.join('\n'),
  };
  await this.buildMarketOrLimitOrder(oppo);
  return oppo;
}
