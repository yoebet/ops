import * as Rx from 'rxjs';
import { Exchanges } from '@/exchange/exchanges';
import { AppLogger } from '@/common/app-logger';
import { UserExAccount } from '@/db/models/sys/user-ex-account';
import { ExPublicWsService } from '@/data-ex/ex-public-ws.service';
import { ExPrivateWsService } from '@/data-ex/ex-private-ws.service';
import { ExchangeTradeService } from '@/exchange/exchange-service.types';
import { Strategy } from '@/db/models/strategy/strategy';
import { ExApiKey } from '@/exchange/base/rest/rest.type';
import { StrategyEnv } from '@/strategy/env/strategy-env';
import { ExOrder, OrderIds } from '@/db/models/ex-order';
import { ExPublicDataService } from '@/data-ex/ex-public-data.service';
import { ExOrderService } from '@/ex-sync/ex-order.service';
import { StrategyEnvMarketData } from '@/strategy/env/strategy-env-market-data';
import { Job } from 'bullmq';

import { StrategyJobData } from '@/strategy/strategy.types';

export class StrategyEnvTrade
  extends StrategyEnvMarketData
  implements StrategyEnv
{
  constructor(
    protected readonly strategy: Strategy,
    protected job: Job<StrategyJobData> | undefined,
    protected exchanges: Exchanges,
    protected publicDataService: ExPublicDataService,
    protected publicWsService: ExPublicWsService,
    protected privateWsService: ExPrivateWsService,
    protected exOrderService: ExOrderService,
    protected logger: AppLogger,
  ) {
    super(strategy, publicDataService, publicWsService, logger);
  }

  async ensureApiKey(): Promise<ExApiKey> {
    const strategy = this.strategy;
    if (!strategy.apiKey) {
      const ua = await UserExAccount.findOneBy({
        id: strategy.userExAccountId,
      });
      strategy.apiKey = UserExAccount.buildExApiKey(ua);
    }
    return strategy.apiKey;
  }

  subscribeForOrder(ids: OrderIds): Rx.Observable<ExOrder> {
    const strategy = this.strategy;
    return Rx.from(this.ensureApiKey()).pipe(
      Rx.switchMap((_apiKey) => {
        return this.privateWsService.subscribeForOrder(
          strategy.apiKey,
          strategy.ex,
          strategy.tradeType,
          ids,
        );
      }),
    );
  }

  async waitForOrder(
    ids: OrderIds,
    timeoutSeconds?: number,
  ): Promise<ExOrder | undefined> {
    const strategy = this.strategy;
    await this.ensureApiKey();
    return this.privateWsService.waitForOrder(
      strategy.apiKey,
      strategy.ex,
      strategy.tradeType,
      ids,
      timeoutSeconds,
    );
  }

  getTradeService(): ExchangeTradeService {
    const strategy = this.strategy;
    return this.exchanges.getExTradeService(strategy.ex, strategy.tradeType);
  }

  async trySynchronizeOrder(order: ExOrder): Promise<boolean> {
    const strategy = this.strategy;
    await this.ensureApiKey();
    return this.exOrderService.syncOrder(order, strategy.apiKey);
  }
}
