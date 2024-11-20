import { Injectable, Type } from '@nestjs/common';
import { Exchanges } from '@/exchange/exchanges';
import { AppLogger } from '@/common/app-logger';
import { ExchangeCode, ExTradeType } from '@/db/models/exchange-types';
import { ExPublicWsService } from '@/data-ex/ex-public-ws.service';
import { ExPrivateWsService } from '@/data-ex/ex-private-ws.service';
import { Strategy } from '@/db/models/strategy';
import { ExApiKey } from '@/exchange/base/rest/rest.type';
import { StrategyEnv } from '@/trade-strategy/strategy-env';
import { SimpleMoveTracing } from '@/trade-strategy/strategy/simple-move-tracing';
import { ExPublicDataService } from '@/data-ex/ex-public-data.service';
import { ExOrderService } from '@/ex-sync/ex-order.service';
import { StrategyEnvNormal } from '@/trade-strategy/strategy-env-normal';
import { StrategyEnvMockTrade } from '@/trade-strategy/strategy-env-mock-trade';

@Injectable()
export class StrategyService {
  constructor(
    private exchanges: Exchanges,
    private exPublicDataService: ExPublicDataService,
    private publicWsService: ExPublicWsService,
    private privateWsService: ExPrivateWsService,
    private exOrderService: ExOrderService,
    private logger: AppLogger,
  ) {
    logger.setContext('Strategy');
  }

  async start() {}

  async runStrategy(strategy: Strategy) {
    let helper: StrategyEnv;
    if (strategy.paperTrade) {
      helper = new StrategyEnvMockTrade(
        strategy,
        this.exchanges,
        this.exPublicDataService,
        this.publicWsService,
        this.logger.newLogger(`${strategy.name}.mock-env`),
      );
    } else {
      helper = new StrategyEnvNormal(
        strategy,
        this.exchanges,
        this.exPublicDataService,
        this.publicWsService,
        this.privateWsService,
        this.exOrderService,
        this.logger.newLogger(`${strategy.name}.env`),
      );
    }

    // TODO: register
    if (strategy.templateCode === 'AA') {
      const runner = new SimpleMoveTracing(
        strategy,
        helper,
        this.logger.subLogger(`${strategy.templateCode}/${strategy.id}`),
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
