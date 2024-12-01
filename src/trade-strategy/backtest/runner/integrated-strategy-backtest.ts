import {
  CheckOpportunityParams,
  OppCheckerAlgo,
} from '@/trade-strategy/strategy.types';
import { StrategyJobEnv } from '@/trade-strategy/env/strategy-env';
import { AppLogger } from '@/common/app-logger';
import { BacktestStrategy } from '@/db/models/backtest-strategy';
import { KlineDataService } from '@/data-service/kline-data.service';
import { RuntimeParamsBacktest } from '@/trade-strategy/backtest/runner/runtime-params-backtest';
import { BacktestOrder } from '@/db/models/backtest-order';
import { BacktestKline } from '@/data-service/models/kline';

export type Triple = 'Y' | 'N' | 'UNK';

export class IntegratedStrategyBacktest extends RuntimeParamsBacktest<CheckOpportunityParams> {
  constructor(
    protected strategy: BacktestStrategy,
    protected klineDataService: KlineDataService,
    protected jobEnv: StrategyJobEnv,
    protected logger: AppLogger,
  ) {
    super(strategy, klineDataService, jobEnv, logger);
  }

  protected async backtest(): Promise<void> {
    const strategy = this.strategy;
    const currentDeal = strategy.currentDeal;
    const lastOrder = currentDeal.lastOrder;

    const kld = this.klineData;
    let ol = 0;

    let pendingOrder = currentDeal.pendingOrder;

    while (true) {
      ol++;
      await this.logJob(`${ol}`);
      const tl = kld.getCurrentLevel();
      if (kld.isTopLevel()) {
        this.logger.log(`${tl.timeCursor.toISOTime()} ${tl.interval}`);
      }
      const kline = await kld.getKline();
      if (!kline) {
        this.logger.log(`- missing`);
        const moved = kld.moveOver();
        if (!moved) {
          break;
        }
        continue;
      }

      while (true) {
        let opp: Triple;
        if (pendingOrder) {
          opp = await this.checkOrderWouldFill(kline, pendingOrder);
        } else {
          opp = await this.checkOpportunity(kline);
        }
        if (opp === 'N') {
          break;
        }
        if (kld.isLowestLevel()) {
          if (pendingOrder) {
            // fill
          } else {
            // place order
            // ...
            pendingOrder = currentDeal.pendingOrder;
          }
          break;
        }
        kld.moveDownLevel();
      }
      const moved = kld.moveOver();
      if (!moved) {
        break;
      }
    }
  }

  protected async checkOpportunity(kline: BacktestKline): Promise<Triple> {
    const currentDeal = this.strategy.currentDeal;
    const lastOrder = currentDeal?.lastOrder;
    if (lastOrder) {
      return this.checkCloseDealOpportunity(kline);
    }
    return this.checkOpenDealOpportunity(kline);
  }

  protected async checkOpenDealOpportunity(
    kline: BacktestKline,
  ): Promise<Triple> {
    const strategy = this.strategy;
    const currentDeal = strategy.currentDeal;

    const params = this.getOpenRuntimeParams();
    const orderTag = 'open';
    const side = strategy.openDealSide;
    switch (params.algo) {
      case OppCheckerAlgo.BR:
        break;
      case OppCheckerAlgo.FP:
        break;
      case OppCheckerAlgo.LS:
        break;
      case OppCheckerAlgo.MV:
        break;
      case OppCheckerAlgo.JP:
        break;
      default:
        return undefined;
    }
    return 'UNK';
  }

  protected async checkCloseDealOpportunity(
    kline: BacktestKline,
  ): Promise<Triple> {
    const strategy = this.strategy;
    const currentDeal = strategy.currentDeal;
    const lastOrder = currentDeal?.lastOrder;

    const params = this.getOpenRuntimeParams();
    const orderTag = 'close';
    const side = this.inverseSide(lastOrder.side);
    switch (params.algo) {
      case OppCheckerAlgo.BR:
        break;
      case OppCheckerAlgo.FP:
        break;
      case OppCheckerAlgo.LS:
        break;
      case OppCheckerAlgo.MV:
        break;
      case OppCheckerAlgo.JP:
        break;
      default:
        return undefined;
    }
  }

  protected async checkOrderWouldFill(
    kline: BacktestKline,
    order: BacktestOrder,
  ): Promise<Triple> {
    return 'UNK';
  }
}
