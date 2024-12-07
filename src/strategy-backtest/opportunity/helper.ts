import {
  BacktestTradeOppo,
  BaseBacktestRunner,
  CheckOppoOptions,
} from '@/strategy-backtest/runner/base-backtest-runner';
import { OrderTag } from '@/db/models/ex-order';
import { BacktestKline } from '@/data-service/models/kline';

export async function checkStopLossAndTimeLimit(
  this: BaseBacktestRunner,
  kl: BacktestKline,
  oppor: Partial<BacktestTradeOppo>,
  options: CheckOppoOptions,
): Promise<BacktestTradeOppo | undefined> {
  const { kld, tsTo, stopLossPrice, closeSide } = options;

  const intervalEndTs = kld.getIntervalEndTs();

  if (stopLossPrice && stopLossPrice >= kl.low && stopLossPrice <= kl.high) {
    if (kld.moveDownLevel()) {
      return undefined;
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

  return undefined;
}
