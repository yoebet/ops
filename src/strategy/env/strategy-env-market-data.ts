import { AppLogger } from '@/common/app-logger';
import { ExchangeCode } from '@/db/models/exchange-types';
import {
  ExPublicWsService,
  WatchRtPriceParams,
  WatchRtPriceResult,
} from '@/data-ex/ex-public-ws.service';
import { ExKline } from '@/exchange/exchange-service.types';
import { Strategy } from '@/db/models/strategy/strategy';
import { ExPublicDataService } from '@/data-ex/ex-public-data.service';
import { MarketDataSupport } from '@/strategy/env/strategy-env';

export class StrategyEnvMarketData implements MarketDataSupport {
  constructor(
    protected readonly strategy: Strategy,
    protected publicDataService: ExPublicDataService,
    protected publicWsService: ExPublicWsService,
    protected logger: AppLogger,
  ) {}

  getLastPrice(params?: {
    ex?: ExchangeCode;
    symbol?: string;
    cacheTimeLimit?: number;
  }): Promise<number> {
    const strategy = this.strategy;
    return this.publicDataService.getLastPrice(
      params?.ex || strategy.ex,
      params?.symbol || strategy.symbol,
      params?.cacheTimeLimit,
    );
  }

  getLatestKlines(params: {
    ex?: ExchangeCode;
    symbol?: string;
    interval: string;
    limit?: number;
  }): Promise<ExKline[]> {
    const strategy = this.strategy;
    return this.publicDataService.getLatestKlines(
      params.ex || strategy.ex,
      params.symbol || strategy.symbol,
      params.interval,
      params.limit,
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
}
