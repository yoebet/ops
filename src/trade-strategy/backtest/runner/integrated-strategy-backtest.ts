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
import { BacktestKlineLevelsData } from '@/trade-strategy/backtest/backtest-kline-levels-data';
import { TimeLevel } from '@/db/models/time-level';
import { BacktestTradeOpportunity } from '@/trade-strategy/backtest/runner/base-backtest-runner';

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

    const kld = this.klineData;
    let ol = 0;

    while (true) {
      ol++;
      await this.logJob(`round #${ol}`);
      const currentDeal = strategy.currentDeal;
      const pendingOrder = currentDeal.pendingOrder;
      const lastOrder = currentDeal?.lastOrder;

      if (pendingOrder) {
        const moveOn = await this.checkPendingOrderAndFill(kld, pendingOrder);
        if (!moveOn) {
          break;
        }
      } else {
        const rps = this.getRuntimeParams();
        if (lastOrder?.exUpdatedAt) {
          const lastOrderTs = lastOrder.exUpdatedAt.getTime();
          if (rps.minCloseInterval) {
            const seconds = TimeLevel.evalIntervalSeconds(rps.minCloseInterval);
            const minCloseTs = lastOrderTs + seconds * 1000;
            kld.moveOnTime(minCloseTs);
          }
          if (rps.maxCloseInterval) {
            const seconds = TimeLevel.evalIntervalSeconds(rps.maxCloseInterval);
            const oppositeSide = this.inverseSide(lastOrder.side);
            const maxCloseTs = lastOrderTs + seconds * 1000;
            // if (elapsed > seconds * 1000) {
            //   const oppo: BacktestTradeOpportunity = {
            //     orderTag: 'force-close',
            //     side: oppositeSide,
            //   };
            //   await this.buildMarketOrder(oppo);
            //   await oppo.order.save();
            //   // await this.doPlaceOrder(oppo.order, oppo.params);
            //   return undefined;
            // }
          }
          if (rps.stopLoss?.priceDiffPercent) {
            return Promise.race([
              // this.checkAndWaitToStopLoss(),
              // this.checkAndWaitToCloseDeal(),
            ]);
          } else {
            // return this.checkAndWaitToCloseDeal();
          }
        }
        const moveOn = await this.checkAndPlaceOrder(kld);
        if (!moveOn) {
          break;
        }
      }
    }
  }

  protected async checkAndPlaceOrder(
    kld: BacktestKlineLevelsData,
  ): Promise<boolean> {
    const currentDeal = this.strategy.currentDeal;
    const lastOrder = currentDeal?.lastOrder;
    if (lastOrder) {
      await this.checkCloseDealOpportunity(kld);
    } else {
      await this.checkOpenDealOpportunity(kld);
    }
    return true;
  }

  protected async checkOpenDealOpportunity(
    kld: BacktestKlineLevelsData,
  ): Promise<boolean> {
    const strategy = this.strategy;
    const currentDeal = strategy.currentDeal;

    const params = this.getOpenRuntimeParams();
    const orderTag = 'open';
    const side = strategy.openDealSide;
    switch (params.algo) {
      case OppCheckerAlgo.BR:
        break;
      case OppCheckerAlgo.LS:
        break;
      case OppCheckerAlgo.JP:
        break;
      case OppCheckerAlgo.MV:
        break;
      case OppCheckerAlgo.FP:
        break;
      default:
        return false;
    }
    return true;
  }

  protected async checkCloseDealOpportunity(
    kld: BacktestKlineLevelsData,
  ): Promise<BacktestTradeOpportunity> {
    const strategy = this.strategy;
    const currentDeal = strategy.currentDeal;
    const lastOrder = currentDeal?.lastOrder;

    const params = this.getOpenRuntimeParams();
    const orderTag = 'close';
    const side = this.inverseSide(lastOrder.side);
    switch (params.algo) {
      case OppCheckerAlgo.BR:
        break;
      case OppCheckerAlgo.LS:
        break;
      case OppCheckerAlgo.JP:
        break;
      case OppCheckerAlgo.MV:
        break;
      case OppCheckerAlgo.FP:
        break;
      default:
        return undefined;
    }
    return undefined;
  }

  protected async checkPendingOrderAndFill(
    kld: BacktestKlineLevelsData,
    order: BacktestOrder,
  ): Promise<boolean> {
    const params = this.getOpenRuntimeParams();
    return true;
  }
}
