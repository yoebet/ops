import {
  ConsiderSide,
  JumpCheckerParams,
  TradeOpportunity,
} from '@/trade-strategy/strategy.types';
import { TimeLevel } from '@/db/models/time-level';
import { wait } from '@/common/utils/utils';
import { TradeSide } from '@/data-service/models/base';
import { BaseRunner } from '@/trade-strategy/strategy/base-runner';
import {
  evalKlineAgg,
  evalTargetPrice,
  KlineAgg,
} from '@/trade-strategy/opportunity/helper';
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
  context?: string,
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
  this.logger.debug(
    `[${context}] priceChange: ${lpcs} ~ ${cpcs}, times: ${times} ~ ${priceChangeTimes}`,
  );
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

  const selfKls = await this.env.getLatestKlines({
    interval,
    limit: jumpPeriods + stopPeriods,
  });
  const jumpKlines = selfKls.slice(0, jumpPeriods);
  const stopKlines = selfKls.slice(jumpPeriods);
  const jumpAgg = evalKlineAgg(jumpKlines);
  const stopAgg = evalKlineAgg(stopKlines);
  if (
    !checkJump.call(
      this,
      jumpKlines,
      stopKlines,
      jumpAgg,
      stopAgg,
      priceChangeTimes,
      'jump',
    )
  ) {
    const waitPeriods = 0.5;
    await this.logJob(`quiet, wait ${waitPeriods}*${interval}`);
    await wait(waitPeriods * intervalSeconds * 1000);
    return undefined;
  }

  const side =
    stopAgg.avgPrice < jumpAgg.avgPrice ? TradeSide.buy : TradeSide.sell;
  if (considerSide !== 'both' && side !== considerSide) {
    return undefined;
  }

  let orderPrice: number = undefined;
  if (params.limitPriceDiffPercent) {
    const lastPrice = await this.env.getLastPrice();
    orderPrice = evalTargetPrice(lastPrice, params.limitPriceDiffPercent, side);
  }

  const oppo: TradeOpportunity = { orderTag, side, orderPrice };
  await this.buildMarketOrLimitOrder(oppo);
  return oppo;
}
