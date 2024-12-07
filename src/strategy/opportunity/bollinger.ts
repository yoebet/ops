import {
  BBCheckerParams,
  ConsiderSide,
  TradeOpportunity,
} from '@/strategy/strategy.types';
import { TimeLevel } from '@/db/models/time-level';
import { wait } from '@/common/utils/utils';
import { TradeSide } from '@/data-service/models/base';
import { BaseRunner } from '@/strategy/strategy/base-runner';
import { evalBBands } from '@/strategy/opportunity/helper';
import { DefaultBollingerBandN } from '@/strategy/strategy.constants';

export async function checkBollingerBandOpp(
  this: BaseRunner,
  params: BBCheckerParams,
  considerSide: ConsiderSide,
  oppor?: Partial<TradeOpportunity>,
): Promise<TradeOpportunity | undefined> {
  const { interval, periods, stdTimes } = params;

  const intervalSeconds = TimeLevel.evalIntervalSeconds(interval);

  const klines = await this.env.getLatestKlines({
    interval,
    limit: periods || DefaultBollingerBandN,
  });
  const bband = evalBBands(klines, stdTimes);

  let side: TradeSide;
  const price = await this.env.getLastPrice();
  if (price < bband.lower) {
    side = TradeSide.buy;
  } else if (price > bband.upper) {
    side = TradeSide.sell;
  } else {
    // await this.logJob(`in band, wait ${interval}`);
    await wait(intervalSeconds * 1000);
    return undefined;
  }

  if (considerSide !== 'both' && side !== considerSide) {
    return undefined;
  }

  const ls = bband.lower.toPrecision(6);
  const ms = bband.ma.toPrecision(6);
  const us = bband.upper.toPrecision(6);
  const memo = `lower: ${ls}, ma: ${ms}, upper: ${us}`;
  await this.logJob(memo);

  const oppo: TradeOpportunity = {
    ...oppor,
    side,
    // orderPrice,
    memo,
  };
  await this.buildMarketOrLimitOrder(oppo);
  return oppo;
}
