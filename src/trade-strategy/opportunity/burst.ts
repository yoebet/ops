import {
  BRCheckerParams,
  ConsiderSide,
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

export async function checkBurstOpp(
  this: BaseRunner,
  params: BRCheckerParams,
  considerSide: ConsiderSide,
  orderTag?: string,
): Promise<TradeOpportunity | undefined> {
  const {
    interval,
    periods,
    checkPeriods,
    contrastPeriods,
    baselineAmountTimes,
    baselinePriceChangeTimes,
    selfAmountTimes,
    selfPriceChangeTimes,
  } = params;
  const latestFrom = periods - checkPeriods;

  const intervalSeconds = TimeLevel.evalIntervalSeconds(interval);

  let waitPeriods = 0.5;
  const selfKls = await this.env.getLatestKlines({
    interval,
    limit: periods,
  });
  const selfContrastAgg = evalKlineAgg(selfKls.slice(0, contrastPeriods));
  const selfLatestAgg = evalKlineAgg(selfKls.slice(latestFrom));
  if (
    !checkBurst.call(
      this,
      selfContrastAgg,
      selfLatestAgg,
      selfAmountTimes,
      selfPriceChangeTimes,
      'self',
    )
  ) {
    await this.logJob(`quiet, wait ${waitPeriods}*${interval}`);
    await wait(waitPeriods * intervalSeconds * 1000);
    return undefined;
  }

  const side =
    selfLatestAgg.avgPrice > selfContrastAgg.avgPrice
      ? TradeSide.buy
      : TradeSide.sell;

  if (considerSide !== 'both' && side !== considerSide) {
    return undefined;
  }

  waitPeriods = 6;
  const waitMs = waitPeriods * intervalSeconds * 1000;
  const waitStr = `wait ${waitPeriods}*${interval}`;

  const baselineSymbol = 'BTC/USDT';
  if (this.strategy.symbol !== baselineSymbol) {
    const baselineKls = await this.env.getLatestKlines({
      symbol: baselineSymbol,
      interval,
      limit: periods,
    });
    const blContrastAgg = evalKlineAgg(baselineKls.slice(0, contrastPeriods));
    const blLatestAgg = evalKlineAgg(baselineKls.slice(latestFrom));
    if (
      checkBurst.call(
        this,
        blContrastAgg,
        blLatestAgg,
        baselineAmountTimes,
        baselinePriceChangeTimes,
        'baseline',
      )
    ) {
      await this.logJob(`no special, ${waitStr}`);
      await wait(waitMs);
      return undefined;
    }
  }

  const lastKlPrice = selfKls[selfKls.length - 1].close;
  const lastPrice = await this.env.getLastPrice();
  if (side === TradeSide.buy) {
    if (lastPrice < lastKlPrice) {
      await this.logJob(`still, ${waitStr}`);
      await wait(waitMs);
      return undefined;
    }
  } else {
    if (lastPrice > lastKlPrice) {
      await this.logJob(`still, ${waitStr}`);
      await wait(waitMs);
      return undefined;
    }
  }

  let orderPrice: number = undefined;
  if (params.limitPriceDiffPercent) {
    orderPrice = evalTargetPrice(lastPrice, params.limitPriceDiffPercent, side);
  }

  const oppo: TradeOpportunity = { orderTag, side, orderPrice };
  await this.buildMarketOrLimitOrder(oppo);
  return oppo;
}
