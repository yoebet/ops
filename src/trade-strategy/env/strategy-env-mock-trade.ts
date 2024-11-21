import * as Rx from 'rxjs';
import { AppLogger } from '@/common/app-logger';
import { UserExAccount } from '@/db/models/user-ex-account';
import { ExPublicWsService } from '@/data-ex/ex-public-ws.service';
import { ExchangeTradeService } from '@/exchange/exchange-service-types';
import { Strategy } from '@/db/models/strategy';
import { ExApiKey } from '@/exchange/base/rest/rest.type';
import { ExOrder, OrderIds } from '@/db/models/ex-order';
import { ExPublicDataService } from '@/data-ex/ex-public-data.service';
import { MockExTradeService } from '@/trade-strategy/env/mock-ex-trade-service';
import { StrategyEnvMarketData } from '@/trade-strategy/env/strategy-env-market-data';
import { StrategyEnv } from '@/trade-strategy/env/strategy-env';
import { JobsService } from '@/job/jobs.service';
import { MockOrderTracingService } from '@/trade-strategy/mock-order-tracing.service';

export class StrategyEnvMockTrade
  extends StrategyEnvMarketData
  implements StrategyEnv
{
  tradeService: MockExTradeService;

  constructor(
    protected readonly strategy: Strategy,
    protected publicDataService: ExPublicDataService,
    protected publicWsService: ExPublicWsService,
    protected jobsService: JobsService,
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
