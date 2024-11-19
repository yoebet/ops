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

export interface StrategyHelper {
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

  subscribeForOrder(order: OrderIds): Observable<ExOrder>;

  waitForOrder(
    order: OrderIds,
    timeoutSeconds?: number,
  ): Promise<ExOrder | undefined>;

  getExTradeService(): ExchangeTradeService;
}
