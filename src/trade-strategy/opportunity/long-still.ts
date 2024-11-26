import {
  LSCheckerParams,
  TradeOpportunity,
} from '@/trade-strategy/strategy.types';
import { TimeLevel } from '@/db/models/time-level';
import { wait } from '@/common/utils/utils';
import { TradeSide } from '@/data-service/models/base';
import { BaseRunner } from '@/trade-strategy/strategy/base-runner';
import { evalKlineAgg, KlineAgg } from '@/trade-strategy/opportunity/helper';

function checkStill(
  this: BaseRunner,
  contrastAgg: KlineAgg,
  latestAgg: KlineAgg,
  amountTimes: number,
  priceChangeTimes: number,
): boolean {
  const laa = latestAgg.avgAmount;
  const caa = contrastAgg.avgAmount;
  const lpc = latestAgg.avgPriceChange;
  const cpc = contrastAgg.avgPriceChange;
  if (!laa || !caa || !lpc || !cpc) {
    return false;
  }
  this.logger.debug(
    `avgAmount: ${laa.toFixed(0)} ~ ${caa.toFixed(0)}, times: ${(laa / caa).toFixed(2)} ~ ${amountTimes}`,
  );
  this.logger.debug(
    `priceChange: ${lpc.toPrecision(6)} ~ ${cpc.toPrecision(6)}, times: ${(lpc / cpc).toFixed(2)} ~ ${priceChangeTimes}`,
  );
  return laa < caa * amountTimes && lpc < cpc * priceChangeTimes;
}

export async function checkLongStillOpp(
  this: BaseRunner,
  params: LSCheckerParams,
  bounceBackTrend: boolean,
  orderTag?: string,
): Promise<TradeOpportunity | undefined> {
  const {
    interval,
    periods,
    checkPeriods,
    contrastPeriods,
    amountTimes,
    priceChangeTimes,
  } = params;
  const latestFrom = periods - checkPeriods;

  const intervalSeconds = TimeLevel.evalIntervalSeconds(interval);

  const selfKls = await this.env.getLatestKlines({
    interval,
    limit: periods,
  });
  const selfContrastAgg = evalKlineAgg(selfKls.slice(0, contrastPeriods));
  const selfLatestAgg = evalKlineAgg(selfKls.slice(latestFrom));
  if (
    !checkStill.call(
      this,
      selfContrastAgg,
      selfLatestAgg,
      amountTimes,
      priceChangeTimes,
    )
  ) {
    await this.logJob(`quiet, wait ${interval}`);
    await wait(intervalSeconds * 1000);
    return undefined;
  }

  const side =
    selfLatestAgg.avgPrice > selfContrastAgg.avgPrice && bounceBackTrend
      ? TradeSide.sell
      : TradeSide.buy;

  return {
    orderTag,
    side,
  };
}
