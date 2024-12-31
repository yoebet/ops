import {
  BacktestTradeOppo,
  BaseBacktestRunner,
  CheckOppoOptions,
} from '@/strategy-backtest/runner/base-backtest-runner';
import { PressureCheckerParams } from '@/strategy/strategy.types';
import { TradeSide } from '@/data-service/models/base';
import { checkStopLossAndTimeLimit } from '@/strategy-backtest/opportunity/helper';
import { checkPressure } from '@/strategy/opportunity/pressure';

export async function checkPressureContinuous(
  this: BaseBacktestRunner,
  params: PressureCheckerParams,
  oppor: Partial<BacktestTradeOppo>,
  options: CheckOppoOptions,
): Promise<BacktestTradeOppo | undefined> {
  const { kld, considerSide } = options;
  const { interval, periods } = params;

  while (true) {
    kld.resetLevel(interval);

    const kl = await kld.getKline();
    if (!kl) {
      return undefined;
    }

    const klines = await kld.getKlinesTillNow(interval, periods);

    const info: string[] = [];
    let side: TradeSide;
    let result: ReturnType<typeof checkPressure>;
    if (considerSide !== 'both') {
      side = considerSide;
      result = checkPressure.call(this, klines, params, considerSide, info);
    } else {
      side = TradeSide.buy;
      result = checkPressure.call(this, klines, params, side, info);
      if (!result) {
        side = TradeSide.sell;
        result = checkPressure.call(this, klines, params, side, info);
      }
    }

    if (result) {
      const intervalEndTs = kld.getIntervalEndTs();
      const oppo: BacktestTradeOppo = {
        ...oppor,
        side,
        orderPrice: result.orderPrice,
        orderTime: new Date(intervalEndTs),
        memo: info.join('\n'),
      };
      await this.buildMarketOrder(oppo);
      return oppo;
    }

    const oppo = await checkStopLossAndTimeLimit.call(this, kl, oppor, options);
    if (oppo) {
      return oppo;
    }

    const hasNext = kld.moveOverLevel(interval);
    if (!hasNext) {
      return undefined;
    }
  }
}
