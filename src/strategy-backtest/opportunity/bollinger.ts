import {
  BacktestTradeOppo,
  BaseBacktestRunner,
  CheckOppoOptions,
} from '@/strategy-backtest/runner/base-backtest-runner';
import { BBCheckerParams } from '@/strategy/strategy.types';
import { TradeSide } from '@/data-service/models/base';
import { evalBBands } from '@/strategy/opportunity/helper';
import { OrderTag } from '@/db/models/ex-order';
import { DefaultBollingerBandN } from '@/strategy/strategy.constants';

export async function checkBollingerContinuous(
  this: BaseBacktestRunner,
  params: BBCheckerParams,
  oppor: Partial<BacktestTradeOppo>,
  options: CheckOppoOptions,
): Promise<BacktestTradeOppo | undefined> {
  const { kld, considerSide, tsTo, stopLossPrice, closeSide } = options;
  const { interval, periods, stdTimes } = params;

  while (true) {
    kld.resetLevel(interval);

    const kl = await kld.getKline();

    const klines = await kld.getKlinesTillNow(
      interval,
      periods || DefaultBollingerBandN,
    );
    const bband = evalBBands(klines, stdTimes);

    let side: TradeSide;
    const price = kl.close;
    if (price < bband.lower) {
      side = TradeSide.buy;
    } else if (price > bband.upper) {
      side = TradeSide.sell;
    }

    const intervalEndTs = kld.getIntervalEndTs();

    if (side && (considerSide === 'both' || side === considerSide)) {
      const ls = bband.lower.toPrecision(6);
      const ms = bband.ma.toPrecision(6);
      const us = bband.upper.toPrecision(6);
      const memo = `price: ${price}, lower: ${ls}, ma: ${ms}, upper: ${us}`;
      await this.logJob(memo);
      const oppo: BacktestTradeOppo = {
        ...oppor,
        side,
        orderPrice: price,
        orderTime: new Date(intervalEndTs),
        memo,
      };
      await this.buildMarketOrder(oppo);
      return oppo;
    }

    if (stopLossPrice && stopLossPrice >= kl.low && stopLossPrice <= kl.high) {
      if (kld.moveDownLevel()) {
        continue;
      }
      const oppo: BacktestTradeOppo = {
        ...oppor,
        side: closeSide,
        orderTag: OrderTag.stoploss,
        orderPrice: stopLossPrice,
        orderTime: new Date(intervalEndTs),
        reachStopLossPrice: true,
      };
      await this.buildMarketOrder(oppo);
      return oppo;
    }

    if (tsTo && intervalEndTs >= tsTo) {
      return {
        ...oppor,
        side: closeSide,
        orderTag: OrderTag.forceclose,
        orderPrice: kl.close,
        orderTime: new Date(intervalEndTs),
        reachTimeLimit: true,
      };
    }

    const hasNext = kld.moveOverLevel(interval);
    if (!hasNext) {
      return undefined;
    }
  }
}
