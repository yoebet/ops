import { BaseRunner } from '@/trade-strategy/strategy/base-runner';
import { Strategy } from '@/db/models/strategy';
import { StrategyEnv } from '@/trade-strategy/env/strategy-env';
import { AppLogger } from '@/common/app-logger';

export class BurstMonitor extends BaseRunner {
  constructor(
    protected strategy: Strategy,
    protected env: StrategyEnv,
    protected logger: AppLogger,
  ) {
    super(strategy, env, logger);
  }

  protected resetRuntimeParams(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  protected checkAndWaitOpportunity(): Promise<{ placeOrder?: boolean }> {
    throw new Error('Method not implemented.');
  }

  protected placeOrder(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
