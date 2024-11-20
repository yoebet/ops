import * as Rx from 'rxjs';
import { Observable } from 'rxjs';
import { Exchanges } from '@/exchange/exchanges';
import { AppLogger } from '@/common/app-logger';
import { ExchangeCode, ExMarket } from '@/db/models/exchange-types';
import { UserExAccount } from '@/db/models/user-ex-account';
import {
  ExPublicWsService,
  WatchRtPriceParams,
  WatchRtPriceResult,
} from '@/data-ex/ex-public-ws.service';
import { ExPrivateWsService } from '@/data-ex/ex-private-ws.service';
import {
  ExchangeTradeService,
  ExKline,
} from '@/exchange/exchange-service-types';
import { Strategy } from '@/db/models/strategy';
import { ExApiKey } from '@/exchange/base/rest/rest.type';
import { StrategyEnv } from '@/trade-strategy/strategy-env';
import { ExOrder, OrderIds } from '@/db/models/ex-order';
import { ExPublicDataService } from '@/data-ex/ex-public-data.service';
import { ExOrderService } from '@/ex-sync/ex-order.service';

export class StrategyEnvNormal implements StrategyEnv {
  constructor(
    protected readonly strategy: Strategy,
    protected exchanges: Exchanges,
    protected publicDataService: ExPublicDataService,
    protected publicWsService: ExPublicWsService,
    protected privateWsService: ExPrivateWsService,
    protected exOrderService: ExOrderService,
    protected logger: AppLogger,
  ) {}

  getLastPrice(params?: {
    ex?: ExchangeCode;
    market?: ExMarket;
    rawSymbol?: string;
    cacheTimeLimit?: number;
  }): Promise<number> {
    const strategy = this.strategy;
    return this.publicDataService.getLastPrice(
      params?.ex || strategy.ex,
      params?.market || strategy.market,
      params?.rawSymbol || strategy.rawSymbol,
      params?.cacheTimeLimit,
    );
  }

  getLatestKlines(params: {
    ex?: ExchangeCode;
    market?: ExMarket;
    rawSymbol?: string;
    interval: string;
    limit?: number;
  }): Promise<ExKline[]> {
    const strategy = this.strategy;
    return this.publicDataService.getLatestKlines(
      params.ex || strategy.ex,
      params.market || strategy.market,
      params.rawSymbol || strategy.rawSymbol,
      params.interval,
    );
  }

  async watchRtPrice(
    params: WatchRtPriceParams & { ex?: ExchangeCode; symbol?: string },
  ): Promise<WatchRtPriceResult> {
    const strategy = this.strategy;
    return this.publicWsService.watchRtPrice(
      params.ex || strategy.ex,
      params.symbol || strategy.symbol,
      params,
    );
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

  subscribeForOrder(ids: OrderIds): Observable<ExOrder> {
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
