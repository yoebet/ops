import { ExKline } from '@/exchange/exchange-service-types';
import {
  BRCheckerParams,
  TradeOpportunity,
} from '@/trade-strategy/strategy.types';
import { TimeLevel } from '@/db/models/time-level';
import { wait } from '@/common/utils/utils';
import { TradeSide } from '@/data-service/models/base';
import { BaseRunner } from '@/trade-strategy/strategy/base-runner';

interface KlineAgg {
  // size: number;
  // amount: number;
  avgAmount: number;
  // minAmount: number;
  // maxAmount: number;
  // amountFluc: number;
  avgPrice: number;
  // minPrice: number;
  // maxPrice: number;
  // priceFluc: number;
  // priceChange: number;
  // minPriceChange: number;
  // maxPriceChange: number;
  avgPriceChange: number;
}

function fluctuationPercent(avg: number, low: number, high: number): number {
  // return Math.max(Math.abs(high - avg) / avg, Math.abs(avg - low) / avg);
  return (Math.abs(high - low) / (avg * 2)) * 100;
}

function evalKlineAgg(klines: ExKline[]): KlineAgg | undefined {
  const firstKline = klines[0];
  const lastKline = klines[klines.length - 1];
  let size = 0;
  let amount = 0;
  let minAmount = null;
  let maxAmount = 0;
  let minPrice = null;
  let maxPrice = 0;
  let minPriceChange = null;
  let maxPriceChange = 0;
  for (const k of klines) {
    if (!k.size) {
      continue;
    }
    size += k.size;
    amount += k.amount;
    if (minAmount === null || minAmount > k.amount) {
      minAmount = k.amount;
    }
    if (maxAmount < k.amount) {
      maxAmount = k.amount;
    }
    if (minPrice === null || minPrice > k.low) {
      minPrice = k.low;
    }
    if (maxPrice < k.high) {
      maxPrice = k.high;
    }
    const pc = Math.abs(k.close - k.open);
    if (minPriceChange === null || minPriceChange > pc) {
      minPriceChange = pc;
    }
    if (maxPriceChange < pc) {
      maxPriceChange = pc;
    }
  }
  if (!size) {
    return undefined;
  }
  const avgAmount = amount / klines.length;
  const avgPrice = amount / size;
  const priceChange = Math.abs(lastKline.close - firstKline.open);
  const avgPriceChange = priceChange / klines.length;

  return {
    avgAmount,
    // amountFluc: fluctuationPercent(avgAmount, minAmount, maxAmount),
    // priceFluc: fluctuationPercent(avgPrice, minPrice, maxPrice),
    avgPrice,
    avgPriceChange,
  };
}

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
    `[${context}] avgAmount: ${laa.toFixed(0)} ~ ${caa.toFixed(0)}, times: ${(laa / caa).toFixed(2)}`,
  );
  this.logger.debug(
    `[${context}] priceChange: ${lpc.toPrecision(6)} ~ ${cpc.toPrecision(6)}, times: ${(lpc / cpc).toFixed(2)}`,
  );
  return laa >= caa * amountTimes && lpc >= cpc * priceChangeTimes;
}

export async function checkBurstOpp(
  this: BaseRunner,
  params: BRCheckerParams,
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
    await this.logJob(`quiet, wait ${interval}`);
    await wait((intervalSeconds * 1000) / 2);
    return undefined;
  }

  const waitMul = 6;
  const waitMs = waitMul * intervalSeconds * 1000;
  const waitStr = `wait ${waitMul}*${interval}`;

  const baselineKls = await this.env.getLatestKlines({
    symbol: 'BTC/USDT',
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

  const side =
    selfLatestAgg.avgPrice > selfContrastAgg.avgPrice
      ? TradeSide.buy
      : TradeSide.sell;

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

  return {
    orderTag,
    side,
  };
}
