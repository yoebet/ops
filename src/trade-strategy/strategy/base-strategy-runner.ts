import { AppLogger } from '@/common/app-logger';
import { Strategy } from '@/db/models/strategy';
import { StrategyHelper } from '@/trade-strategy/strategy/strategy-helper';

export abstract class BaseStrategyRunner {
  protected constructor(
    protected strategy: Strategy,
    protected helper: StrategyHelper,
    protected logger: AppLogger,
  ) {}

  abstract start(): Promise<void>;

  async stop() {}
}
