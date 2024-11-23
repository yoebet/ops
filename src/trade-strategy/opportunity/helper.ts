import { WatchLevel } from '@/trade-strategy/strategy.types';
import { WatchRtPriceParams } from '@/data-ex/ex-public-ws.service';
import { TradeSide } from '@/data-service/models/base';
import {
  IntenseWatchExitThreshold,
  IntenseWatchThreshold,
} from '@/trade-strategy/strategy.constants';
import { HOUR_MS, MINUTE_MS, wait } from '@/common/utils/utils';
import { BaseRunner } from '@/trade-strategy/strategy/base-runner';

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

export async function waitForWatchLevel(
  this: BaseRunner,
  watchLevel: WatchLevel,
  lastPrice: number,
  targetPrice: number,
  logContext: string,
): Promise<boolean> {
  switch (watchLevel) {
    case 'intense':
      let watchRtPriceParams: WatchRtPriceParams;
      const toBuy = this.strategy.nextTradeSide === TradeSide.buy;
      if (toBuy) {
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
      if (toBuy) {
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
