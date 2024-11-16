import { Strategy } from '@/db/models/strategy';
import { Exchanges } from '@/exchange/exchanges';
import { AppLogger } from '@/common/app-logger';

interface MoveTracingParams {
  drawbackRatio?: number;
  activePrice?: number;
}

export class MoveTracing {
  constructor(
    private readonly exchanges: Exchanges,
    private logger: AppLogger,
  ) {
    logger.setContext('strategy/mt');
  }

  run(strategy: Strategy) {
    //
  }
}
