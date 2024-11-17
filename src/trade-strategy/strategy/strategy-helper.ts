import { Strategy } from '@/db/models/strategy';
import { Observable } from 'rxjs';
import { ExKline, SyncOrder } from '@/exchange/exchange-service-types';
import { ExchangeCode, ExMarket } from '@/db/models/exchange-types';

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

  subscribeForOrder(
    order: { exOrderId: string; clientOrderId?: string },
    strategy?: Strategy,
  ): Promise<{ obs: Observable<SyncOrder>; unsubs: () => void }>;
}
