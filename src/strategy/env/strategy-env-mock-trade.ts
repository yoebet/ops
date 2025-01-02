import * as Rx from 'rxjs';
import { AppLogger } from '@/common/app-logger';
import { UserExAccount } from '@/db/models/sys/user-ex-account';
import { ExPublicWsService } from '@/data-ex/ex-public-ws.service';
import { ExchangeTradeService } from '@/exchange/exchange-service.types';
import { Strategy } from '@/db/models/strategy/strategy';
import { ExApiKey } from '@/exchange/base/rest/rest.type';
import { ExOrder, OrderIds } from '@/db/models/ex-order';
import { ExPublicDataService } from '@/data-ex/ex-public-data.service';
import { MockExTradeService } from '@/strategy/env/mock-ex-trade.service';
import { StrategyEnvMarketData } from '@/strategy/env/strategy-env-market-data';
import { StrategyEnv } from '@/strategy/env/strategy-env';
import { MockOrderTracingService } from '@/strategy/mock-order-tracing.service';
import { Job } from 'bullmq';
import { StrategyJobData } from '@/strategy/strategy.types';
import { wait } from '@/common/utils/utils';

export class StrategyEnvMockTrade
  extends StrategyEnvMarketData
  implements StrategyEnv
{
  tradeService: MockExTradeService;

  constructor(
    protected readonly strategy: Strategy,
    protected job: Job<StrategyJobData> | undefined,
    protected publicDataService: ExPublicDataService,
    protected publicWsService: ExPublicWsService,
    protected mockOrderTracingService: MockOrderTracingService,
    protected logger: AppLogger,
  ) {
    super(strategy, publicDataService, publicWsService, logger);
  }

  async ensureApiKey(): Promise<ExApiKey> {
    const strategy = this.strategy;
    if (!strategy.apiKey) {
      const ua = new UserExAccount();
      strategy.apiKey = UserExAccount.buildExApiKey(ua);
    }
    return strategy.apiKey;
  }

  subscribeForOrder(ids: OrderIds): Rx.Observable<ExOrder> {
    return Rx.EMPTY;
  }

  async waitForOrder(
    ids: OrderIds,
    timeoutSeconds?: number,
  ): Promise<ExOrder | undefined> {
    await wait(60 * 1000);
    return undefined;
  }

  getTradeService(): ExchangeTradeService {
    if (!this.tradeService) {
      this.tradeService = new MockExTradeService(
        this.strategy,
        this.publicDataService,
        this.mockOrderTracingService,
        this.logger.newLogger(`ExTradeService.Mock`),
      );
    }
    return this.tradeService;
  }

  async trySynchronizeOrder(order: ExOrder): Promise<boolean> {
    const order1 = await ExOrder.findOneBy({ id: order.id });
    if (!order1) {
      return false;
    }
    if (order.exUpdatedAt && order1.exUpdatedAt <= order.exUpdatedAt) {
      return false;
    }
    ExOrder.setProps(order, order1);
    return true;
  }
}
