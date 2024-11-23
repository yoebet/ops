import { ExKline } from '@/exchange/exchange-service-types';
import { CheckOpportunityReturn } from '@/trade-strategy/strategy.types';
import { TimeLevel } from '@/db/models/time-level';
import { wait } from '@/common/utils/utils';
import { TradeSide } from '@/data-service/models/base';
import { BaseRunner } from '@/trade-strategy/strategy/base-runner';

interface KlineAgg {
  // size: number;
  // amount: number;
  // avgAmount: number;
  // minAmount: number;
  // maxAmount: number;
  amountFluctuation: number;
  avgPrice: number;
  // minPrice: number;
  // maxPrice: number;
  priceFluctuation: number;
  // priceChange: number;
  // minPriceChange: number;
  // maxPriceChange: number;
  // avgPriceChange: number;
}

function fluctuationPercent(avg: number, low: number, high: number): number {
  // return Math.max(Math.abs(high - avg) / avg, Math.abs(avg - low) / avg);
  return (Math.abs(high - low) / (avg * 2)) * 100;
}

function evalKlineAgg(klines: ExKline[]): KlineAgg | undefined {
  // const firstKline = klines[0];
  // const lastKline = klines[klines.length - 1];
  let size = 0;
  let amount = 0;
  let minAmount = 0;
  let maxAmount = 0;
  let minPrice = 0;
  let maxPrice = 0;
  let minPriceChange = 0;
  let maxPriceChange = 0;
  for (const k of klines) {
    if (!k.size) {
      continue;
    }
    size += k.size;
    amount += k.amount;
    if (minAmount > k.amount) {
      minAmount = k.amount;
    }
    if (maxAmount < k.amount) {
      maxAmount = k.amount;
    }
    if (minPrice > k.low) {
      minPrice = k.low;
    }
    if (maxPrice < k.high) {
      maxPrice = k.high;
    }
    const pc = Math.abs(k.close - k.open);
    if (minPriceChange > pc) {
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
  // const priceChange = Math.abs(lastKline.close - firstKline.open);
  // const avgPriceChange = priceChange / klines.length;

  return {
    // size,
    // amount,
    // avgAmount,
    // minAmount,
    // maxAmount,
    amountFluctuation: fluctuationPercent(avgAmount, minAmount, maxAmount),
    avgPrice,
    // minPrice,
    // maxPrice,
    priceFluctuation: fluctuationPercent(avgPrice, minPrice, maxPrice),
    // priceChange,
    // avgPriceChange,
    // minPriceChange,
    // maxPriceChange,
  };
}

function checkBaselineBurst(
  contrastAgg: KlineAgg,
  latestAgg: KlineAgg,
): boolean {
  return (
    latestAgg.amountFluctuation >= contrastAgg.amountFluctuation * 2 &&
    latestAgg.priceFluctuation >= contrastAgg.priceFluctuation * 1.5
  );
}

function checkSelfBurst(contrastAgg: KlineAgg, latestAgg: KlineAgg): boolean {
  return (
    latestAgg.amountFluctuation >= contrastAgg.amountFluctuation * 5 &&
    latestAgg.priceFluctuation >= contrastAgg.priceFluctuation * 3
  );
}

export async function checkBurstOpp(
  this: BaseRunner,
  orderTag?: string,
): Promise<CheckOpportunityReturn> {
  const interval = '1m';
  const periods = 32;
  const checkPeriods = 2;
  const latestFrom = periods - checkPeriods;
  const contrastTo = latestFrom - 2;

  const intervalSeconds = TimeLevel.evalIntervalSeconds(interval);

  const selfKls = await this.env.getLatestKlines({
    interval,
    limit: periods,
  });
  const selfContrastAgg = evalKlineAgg(selfKls.slice(0, contrastTo));
  const selfLatestAgg = evalKlineAgg(selfKls.slice(latestFrom));
  if (!checkSelfBurst(selfContrastAgg, selfLatestAgg)) {
    await this.logJob(`quiet, wait ${interval}`);
    await wait(intervalSeconds * 1000);
    return {};
  }

  const baselineKls = await this.env.getLatestKlines({
    symbol: 'BTC/USDT',
    interval,
    limit: periods,
  });
  const blContrastAgg = evalKlineAgg(baselineKls.slice(0, contrastTo));
  const blLatestAgg = evalKlineAgg(baselineKls.slice(latestFrom));
  if (checkBaselineBurst(blContrastAgg, blLatestAgg)) {
    await this.logJob(`no special, wait 6*${interval}`);
    await wait(6 * intervalSeconds * 1000);
    return {};
  }

  const side =
    selfLatestAgg.avgPrice > selfContrastAgg.avgPrice
      ? TradeSide.buy
      : TradeSide.sell;

  const lastKlPrice = selfKls[selfKls.length - 1].close;
  const lastPrice = await this.env.getLastPrice();
  if (side === TradeSide.buy) {
    if (lastPrice < lastKlPrice) {
      await this.logJob(`still, wait 6*${interval}`);
      await wait(6 * intervalSeconds * 1000);
      return {};
    }
  } else {
    if (lastPrice > lastKlPrice) {
      await this.logJob(`still, wait 6*${interval}`);
      await wait(6 * intervalSeconds * 1000);
      return {};
    }
  }

  this.strategy.nextTradeSide = side;
  return {
    placeOrder: true,
    orderTag,
  };
}
