import { BRCheckerParams, ConsiderSide } from '@/trade-strategy/strategy.types';
import { Kline } from '@/data-service/models/kline';
import { BaseBacktestRunner } from '@/trade-strategy/backtest/runner/base-backtest-runner';
import { Triple } from '@/trade-strategy/backtest/runner/integrated-strategy-backtest';

export async function checkBurstInTimespan(
  this: BaseBacktestRunner,
  params: BRCheckerParams,
  considerSide: ConsiderSide,
  kline: Kline,
): Promise<Triple> {
  return 'UNK';
}
