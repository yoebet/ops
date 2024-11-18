import { Observable } from 'rxjs';
import { ExKline } from '@/exchange/exchange-service-types';
import { ExchangeCode, ExMarket } from '@/db/models/exchange-types';
import { ExOrder, OrderIds } from '@/db/models/ex-order';

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

  subscribeForOrder(order: OrderIds): Observable<ExOrder>;

  waitForOrder(
    order: OrderIds,
    timeoutSeconds?: number,
  ): Promise<ExOrder | undefined>;
}
