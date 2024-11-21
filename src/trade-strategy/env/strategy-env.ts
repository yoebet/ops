import { Observable } from 'rxjs';
import {
  ExchangeTradeService,
  ExKline,
} from '@/exchange/exchange-service-types';
import { ExchangeCode, ExMarket } from '@/db/models/exchange-types';
import { ExOrder, OrderIds } from '@/db/models/ex-order';
import {
  WatchRtPriceParams,
  WatchRtPriceResult,
} from '@/data-ex/ex-public-ws.service';
import { ExApiKey } from '@/exchange/base/rest/rest.type';
import { Job } from 'bullmq';

import { StrategyJobData } from '@/trade-strategy/strategy.types';

export interface MarketDataSupport {
  getLastPrice(params?: {
    ex?: ExchangeCode;
    market?: ExMarket;
    rawSymbol?: string;
    cacheTimeLimit?: number;
  }): Promise<number>;

  getLatestKlines(params: {
    ex?: ExchangeCode;
    market?: ExMarket;
    rawSymbol?: string;
    interval: string;
    limit?: number;
  }): Promise<ExKline[]>;

  watchRtPrice(
    params: WatchRtPriceParams & {
      ex?: ExchangeCode;
      symbol?: string;
    },
  ): Promise<WatchRtPriceResult>;
}

export interface StrategyEnv extends MarketDataSupport {
  subscribeForOrder(order: OrderIds): Observable<ExOrder>;

  waitForOrder(
    order: OrderIds,
    timeoutSeconds?: number,
  ): Promise<ExOrder | undefined>;

  getTradeService(): ExchangeTradeService;

  trySynchronizeOrder(order: ExOrder): Promise<boolean>;

  ensureApiKey(): Promise<ExApiKey>;

  getThisJob(): Job<StrategyJobData> | undefined;
}
