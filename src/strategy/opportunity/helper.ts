import { WatchLevel } from '@/strategy/strategy.types';
import { WatchRtPriceParams } from '@/data-ex/ex-public-ws.service';
import { TradeSide } from '@/data-service/models/base';
import {
  DefaultBollingerBandK,
  IntenseWatchExitThreshold,
  IntenseWatchThreshold,
} from '@/strategy/strategy.constants';
import {
  evalDiffPercent,
  HOUR_MS,
  MINUTE_MS,
  wait,
} from '@/common/utils/utils';
import { BaseRunner } from '@/strategy/strategy/base-runner';
import { ExKline } from '@/exchange/exchange-service.types';
import { FtKline } from '@/data-service/models/kline';
import * as _ from 'lodash';

export function evalWatchLevel(diffPercentAbs: number): WatchLevel {
  let watchLevel: WatchLevel;
  if (diffPercentAbs <= IntenseWatchThreshold) {
    watchLevel = 'intense';
  } else if (diffPercentAbs <= 0.5) {
    watchLevel = 'high';
  } else if (diffPercentAbs < 1) {
    watchLevel = 'medium';
  } else if (diffPercentAbs < 2) {
    watchLevel = 'loose';
  } else if (diffPercentAbs < 5) {
    watchLevel = 'snap';
  } else if (diffPercentAbs < 10) {
    watchLevel = 'sleep';
  } else {
    watchLevel = 'hibernate';
  }
  return watchLevel;
}

export interface KlineAgg {
  size: number;
  amount: number;
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

export function evalKlineAgg(klines: ExKline[]): KlineAgg | undefined {
  const firstKline = klines[0];
  const lastKline = klines[klines.length - 1];
  let size = 0;
  let amount = 0;
  let minAmount = null;
  let maxAmount = 0;
  // let minPrice = null;
  // let maxPrice = 0;
  // let minPriceChange = null;
  // let maxPriceChange = 0;
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
    // if (minPrice === null || minPrice > k.low) {
    //   minPrice = k.low;
    // }
    // if (maxPrice < k.high) {
    //   maxPrice = k.high;
    // }
    // const pc = Math.abs(k.close - k.open);
    // if (minPriceChange === null || minPriceChange > pc) {
    //   minPriceChange = pc;
    // }
    // if (maxPriceChange < pc) {
    //   maxPriceChange = pc;
    // }
  }
  if (!size) {
    return undefined;
  }
  const avgAmount = amount / klines.length;
  const avgPrice = amount / size;
  const priceChange = Math.abs(lastKline.close - firstKline.open);
  const avgPriceChange = priceChange / klines.length;

  return {
    size,
    amount,
    avgAmount,
    // minPrice,
    // maxPrice,
    avgPrice,
    avgPriceChange,
  };
}

export interface BBand {
  ma: number;
  upper: number;
  lower: number;
}

export function evalBBands(
  klines: ExKline[],
  stdTimes = DefaultBollingerBandK,
): BBand {
  const prices = klines.filter((k) => k.size > 0).map((k) => k.amount / k.size);
  const ma = _.sum(prices) / prices.length;
  const sqs = prices.map((p) => Math.pow(p - ma, 2));
  const std = Math.sqrt(_.sum(sqs) / sqs.length);
  const kstd = std * stdTimes;
  return { ma, upper: ma + kstd, lower: ma - kstd };
}

export async function waitForWatchLevel(
  this: BaseRunner,
  side: TradeSide,
  watchLevel: WatchLevel,
  lastPrice: number,
  targetPrice: number,
  logContext: string,
): Promise<boolean> {
  switch (watchLevel) {
    case 'intense':
      let watchRtPriceParams: WatchRtPriceParams;
      if (side === TradeSide.buy) {
        watchRtPriceParams = {
          lowerBound: targetPrice,
          upperBound: lastPrice * (1 + IntenseWatchExitThreshold / 100),
        };
      } else {
        watchRtPriceParams = {
          lowerBound: lastPrice * (1 - IntenseWatchExitThreshold / 100),
          upperBound: targetPrice,
        };
      }
      const result = await this.env.watchRtPrice({
        ...watchRtPriceParams,
        timeoutSeconds: 10 * 60,
      });

      if (result.timeout) {
        const ps = result.price.toPrecision(6);
        await this.logJob(`timeout, ${ps}(last)`, logContext);
        return false;
      }
      if (side === TradeSide.buy) {
        if (result.reachLower) {
          const ps = result.price.toPrecision(6);
          await this.logJob(`reachLower, ${ps}(last)`, logContext);
          return true;
        }
      } else {
        if (result.reachUpper) {
          const ps = result.price.toPrecision(6);
          await this.logJob(`reachUpper, ${ps}(last)`, logContext);
          return true;
        }
      }
      break;
    case 'high':
      // await this.logJob(`wait 5s`, logContext);
      await wait(5 * 1000);
      break;
    case 'medium':
      // await this.logJob(`wait 20s`, logContext);
      await wait(20 * 1000);
      break;
    case 'loose':
      await this.logJob(`wait 1m`, logContext);
      await wait(MINUTE_MS);
      break;
    case 'snap':
      await this.logJob(`wait 5m`, logContext);
      await wait(5 * MINUTE_MS);
      break;
    case 'sleep':
      await this.logJob(`wait 30m`, logContext);
      await wait(30 * MINUTE_MS);
      break;
    case 'hibernate':
      await this.logJob(`wait 2h`, logContext);
      await wait(2 * HOUR_MS);
      break;
  }
  return false;
}

export function evalTargetPrice(
  basePrice: number,
  diffPercent: number,
  side: TradeSide,
): number {
  const ratio =
    side === TradeSide.buy ? 1 - diffPercent / 100 : 1 + diffPercent / 100;
  return basePrice * ratio;
}

export async function waitForPrice(
  this: BaseRunner,
  side: TradeSide,
  targetPrice?: number,
): Promise<number | undefined> {
  while (true) {
    const lastPrice = await this.env.getLastPrice();

    if (!targetPrice) {
      await this.logJob('no `orderPrice`, place order now');
      return lastPrice;
    }

    if (side === TradeSide.buy) {
      if (lastPrice <= targetPrice) {
        await this.logJob(`reach, to buy`);
        return targetPrice;
      }
    } else {
      if (lastPrice >= targetPrice) {
        await this.logJob(`reach, to sell`);
        return targetPrice;
      }
    }
    const logContext = side === TradeSide.sell ? 'wait-up' : 'wait-down';

    const diffPercent = evalDiffPercent(lastPrice, targetPrice);
    const diffPercentAbs = Math.abs(diffPercent);

    const watchLevel = evalWatchLevel(diffPercentAbs);
    const lps = lastPrice.toPrecision(6);
    const tps = targetPrice.toPrecision(6);
    await this.logJob(
      `watch level: ${watchLevel}, ${lps}(last) -> ${tps}, ${diffPercent.toFixed(4)}%`,
      logContext,
    );

    const strategy = this.strategy;
    const cdId = strategy.currentDealId;
    const loId = strategy.currentDeal?.lastOrderId;

    const reachPrice = await waitForWatchLevel.call(
      this,
      side,
      watchLevel,
      lastPrice,
      targetPrice,
      logContext,
    );

    const cdId2 = strategy.currentDealId;
    const loId2 = strategy.currentDeal?.lastOrderId;
    if (cdId !== cdId2 || loId !== loId2) {
      return undefined;
    }
    if (reachPrice) {
      return targetPrice;
    }

    await this.checkCommands();
  }
}

export async function checkPriceReached(
  this: BaseRunner,
  side: TradeSide,
  targetPrice: number,
): Promise<boolean> {
  const lastPrice = await this.env.getLastPrice();
  if (side === TradeSide.buy) {
    if (lastPrice <= targetPrice) {
      await this.logJob(`reach, to buy`);
      return true;
    }
  } else {
    if (lastPrice >= targetPrice) {
      await this.logJob(`reach, to sell`);
      return true;
    }
  }
  return false;
}

export function rollAgg(kls: FtKline[]) {
  const len = kls.length;
  let agg = evalKlineAgg(kls);
  return {
    agg,
    next: (newKl: FtKline) => {
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
