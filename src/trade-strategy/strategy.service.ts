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
import { StrategyHelper } from '@/trade-strategy/strategy/strategy-helper';
import { StrategyTemplate } from '@/db/models/strategy-template';
import { SimpleMoveTracing } from '@/trade-strategy/strategy/simple-move-tracing';
import { ExOrder, OrderIds } from '@/db/models/ex-order';
import { ExPublicDataService } from '@/data-ex/ex-public-data.service';

@Injectable()
export class StrategyService {
  constructor(
    private exchanges: Exchanges,
    private exPublicDataService: ExPublicDataService,
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
        return service.exPublicDataService.getLastPrice(
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
        return service.exPublicDataService.getLatestKlines(
          params.ex || strategy.ex,
          params.market || strategy.market,
          params.rawSymbol || strategy.rawSymbol,
          params.interval,
        );
      },
      async watchRtPrice(
        params: WatchRtPriceParams & { ex?: ExchangeCode; symbol?: string },
      ): Promise<WatchRtPriceResult> {
        return service.publicWsService.watchRtPrice(
          params.ex || strategy.ex,
          params.symbol || strategy.symbol,
          params,
        );
      },

      subscribeForOrder(ids: OrderIds): Observable<ExOrder> {
        const sub = () =>
          service.privateWsService.subscribeForOrder(
            strategy.apiKey,
            strategy.ex,
            strategy.tradeType,
            ids,
          );
        if (strategy.apiKey) {
          return sub();
        }
        return Rx.from(
          UserExAccount.findOneBy({
            id: strategy.userExAccountId,
          }),
        ).pipe(
          Rx.switchMap((ua) => {
            strategy.apiKey = UserExAccount.buildExApiKey(ua);
            return sub();
          }),
        );
      },
      async waitForOrder(
        ids: OrderIds,
        timeoutSeconds?: number,
      ): Promise<ExOrder> {
        if (!strategy.apiKey) {
          const ua = await UserExAccount.findOneBy({
            id: strategy.userExAccountId,
          });
          strategy.apiKey = UserExAccount.buildExApiKey(ua);
        }
        return service.privateWsService.waitForOrder(
          strategy.apiKey,
          strategy.ex,
          strategy.tradeType,
          ids,
          timeoutSeconds,
        );
      },
      getExTradeService(): ExchangeTradeService {
        return service.exchanges.getExTradeService(
          strategy.ex,
          strategy.tradeType,
        );
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
}
