import { AppLogger } from '@/common/app-logger';
import { ExchangeCode, ExMarket } from '@/db/models/exchange-types';
import { ExKline, SyncOrder } from '@/exchange/exchange-service-types';
import { Strategy } from '@/db/models/strategy';
import { Observable } from 'rxjs';
import { StrategyHelper } from '@/trade-strategy/strategy/strategy-helper';

export abstract class BaseStrategyRunner {
  protected constructor(
    protected strategy: Strategy,
    protected strategyHelper: StrategyHelper,
    protected logger: AppLogger,
  ) {}

  abstract start(): Promise<void>;

  async stop() {}

  protected async getLastPrice(params?: {
    ex?: ExchangeCode;
    market?: ExMarket;
    rawSymbol?: string;
    cacheTimeLimit?: number;
  }): Promise<number> {
    return this.strategyHelper.getLastPrice(params);
  }

  protected async getLatestKlines(params: {
    ex?: ExchangeCode;
    market?: ExMarket;
    rawSymbol?: string;
    interval: string;
    limit?: number;
  }): Promise<ExKline[]> {
    return this.strategyHelper.getLatestKlines(params);
  }

  protected async subscribeForOrder(order: {
    exOrderId: string;
    clientOrderId?: string;
  }): Promise<{ obs: Observable<SyncOrder>; unsubs: () => void }> {
    return this.strategyHelper.subscribeForOrder(order);
  }
}
