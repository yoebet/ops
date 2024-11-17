import { Injectable } from '@nestjs/common';
import * as Rx from 'rxjs';
import { Observable } from 'rxjs';
import { Exchanges } from '@/exchange/exchanges';
import { AppLogger } from '@/common/app-logger';
import {
  ExchangeCode,
  ExMarket,
  ExTradeType,
} from '@/db/models/exchange-types';
import { UserExAccount } from '@/db/models/user-ex-account';
import { ExPublicWsService } from '@/data-ex-ws/ex-public-ws.service';
import { ExPrivateWsService } from '@/data-ex-ws/ex-private-ws.service';
import { ExKline, SyncOrder } from '@/exchange/exchange-service-types';
import { Strategy } from '@/db/models/strategy';
import { ExApiKey } from '@/exchange/base/rest/rest.type';
import { StrategyHelper } from '@/trade-strategy/strategy/strategy-helper';
import { StrategyTemplate } from '@/db/models/strategy-template';
import { SimpleMoveTracing } from '@/trade-strategy/strategy/simple-move-tracing';

@Injectable()
export class StrategyService {
  private latestPrices = new Map<string, { last: number; ts: number }>();

  constructor(
    private exchanges: Exchanges,
    private publicWsService: ExPublicWsService,
    private privateWsService: ExPrivateWsService,
    private logger: AppLogger,
  ) {
    logger.setContext('Strategy');
  }

  async start() {}

  async runStrategy(strategy: Strategy) {
    strategy.template = await StrategyTemplate.findOneBy({
      id: strategy.templateId,
    });

    const service = this;
    const helper: StrategyHelper = {
      getLastPrice(params?: {
        ex?: ExchangeCode;
        market?: ExMarket;
        rawSymbol?: string;
        cacheTimeLimit?: number;
      }): Promise<number> {
        return service.getLastPrice(
          params?.ex || strategy.ex,
          params?.market || strategy.market,
          params?.rawSymbol || strategy.rawSymbol,
          params?.cacheTimeLimit,
        );
      },
      getLatestKlines(params: {
        ex?: ExchangeCode;
        market?: ExMarket;
        rawSymbol?: string;
        interval: string;
        limit?: number;
      }): Promise<ExKline[]> {
        return service.getLatestKlines(
          params.ex || strategy.ex,
          params.market || strategy.market,
          params.rawSymbol || strategy.rawSymbol,
          params.interval,
        );
      },
      subscribeForOrder(order: {
        exOrderId: string;
        clientOrderId?: string;
      }): Promise<{
        obs: Observable<SyncOrder>;
        unsubs: () => void;
      }> {
        return service.subscribeForOrder(strategy, order);
      },
    };

    // TODO: register
    if (strategy.template.code === 'AA') {
      const runner = new SimpleMoveTracing(
        strategy,
        helper,
        this.logger.subLogger(`${strategy.template.code}/${strategy.id}`),
      );
      // TODO: job
      runner.start().catch((err: Error) => {
        this.logger.error(err);
      });
    }
  }

  async startSubscribeExOrders(
    apiKey: ExApiKey,
    ex: ExchangeCode,
    tradeType: ExTradeType,
  ) {
    const { obs, unsubs } = await this.privateWsService.subscribeExOrder(
      apiKey,
      ex,
      tradeType,
    );
  }

  async subscribeForOrder(
    strategy: Strategy,
    order: { exOrderId: string; clientOrderId?: string },
  ): Promise<{ obs: Observable<SyncOrder>; unsubs: () => void }> {
    if (!strategy.apiKey) {
      const ua = await UserExAccount.findOneBy({
        id: strategy.userExAccountId,
      });
      strategy.apiKey = UserExAccount.buildExApiKey(ua);
    }
    const { obs, unsubs } = await this.privateWsService.subscribeExOrder(
      strategy.apiKey,
      strategy.ex,
      strategy.tradeType,
    );
    return {
      obs: obs.pipe(
        Rx.filter((o) => {
          if (order.clientOrderId) {
            return o.orderResp.clientOrderId === order.clientOrderId;
          }
          return o.orderResp.exOrderId === order.exOrderId;
        }),
      ),
      unsubs,
    };
  }

  async getLastPrice(
    ex: ExchangeCode,
    market: ExMarket,
    rawSymbol: string,
    cacheTimeLimit = 5000,
  ): Promise<number> {
    const key = `${ex}:${market}:${rawSymbol}`;
    let lastPrice = this.latestPrices.get(key);
    if (lastPrice && Date.now() - lastPrice.ts <= cacheTimeLimit) {
      return lastPrice.last;
    }
    const dataService = this.exchanges.getExMarketDataService(ex, market);
    lastPrice = await dataService.getPrice(rawSymbol);
    this.latestPrices.set(key, lastPrice);
    return lastPrice.last;
  }

  // okx: 1m+
  // binance: 1s+
  // old to new
  async getLatestKlines(
    ex: ExchangeCode,
    market: ExMarket,
    rawSymbol: string,
    interval: string,
    limit = 60,
  ): Promise<ExKline[]> {
    const dataService = this.exchanges.getExMarketDataService(ex, market);
    let klines = await dataService.getKlines({
      symbol: rawSymbol,
      interval,
      limit,
    });
    if (klines.length > 0) {
      if (klines[0].ts > klines[klines.length - 1].ts) {
        klines = klines.reverse();
      }
    }
    return klines;
  }
}
