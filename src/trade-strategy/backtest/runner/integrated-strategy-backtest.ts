import {
  CheckOpportunityParams,
  OppCheckerAlgo,
  TradeOpportunity,
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
import { BacktestTradeOppo } from '@/trade-strategy/backtest/runner/base-backtest-runner';
import { BacktestKlineData } from '@/trade-strategy/backtest/backtest-kline-data';
import { checkBurstContinuous } from '@/trade-strategy/backtest/opportunity/burst';
import { ExOrderResp, OrderStatus } from '@/db/models/ex-order';
import { fillOrderSize } from '@/trade-strategy/strategy.utils';

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
        let tsTo: number = undefined;
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
            tsTo = lastOrderTs + seconds * 1000;
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
        const moveOn = await this.checkAndPlaceOrder(kld, tsTo);
        if (!moveOn) {
          break;
        }
      }
    }
  }

  protected async checkAndPlaceOrder(
    kld: BacktestKlineLevelsData,
    tsTo?: number,
  ): Promise<boolean> {
    const strategy = this.strategy;
    const currentDeal = strategy.currentDeal;
    const lastOrder = currentDeal?.lastOrder;
    const orderTag = lastOrder ? 'close' : 'open';
    const side = lastOrder
      ? this.inverseSide(lastOrder.side)
      : strategy.openDealSide;
    const params = lastOrder
      ? this.getCloseRuntimeParams()
      : this.getOpenRuntimeParams();
    // const rps = this.getRuntimeParams();
    switch (params.algo) {
      case OppCheckerAlgo.BR:
        const ckld = new BacktestKlineData(
          this.klineDataService,
          strategy.ex,
          params.baselineSymbol || 'BTC/USDT',
          TimeLevel.TL1mTo1d.find((tl) => tl.interval === params.interval),
          this.klineData.getCurrentTimeCursor(params.interval),
        );
        const oppo: BacktestTradeOppo = await checkBurstContinuous.call(
          this,
          params,
          side,
          ckld,
          kld,
          orderTag,
          tsTo,
        );
        if (!oppo) {
          return false;
        }
        if (!oppo.reachTimeLimit) {
          return true;
        }
        await this.placeOrder(oppo);
        return oppo.moveOn;
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
    return true;
  }

  protected async checkPendingOrderAndFill(
    kld: BacktestKlineLevelsData,
    order: BacktestOrder,
  ): Promise<boolean> {
    if (!order.algoOrder) {
      while (true) {
        const kl = await kld.getKline();
        if (!kl) {
          const moved = kld.moveOrRollTime();
          if (moved) {
            continue;
          } else {
            return false;
          }
        }
        const tl = kld.getCurrentLevel();
        this.logger.log(`${tl.interval} ${kl.time.toISOString()} ${kl.open}`);

        const orderPrice = order.limitPrice!;
        if (orderPrice >= kl.low && orderPrice <= kl.high) {
          if (kld.moveDownLevel()) {
            continue;
          }
          const exOrderId = this.newOrderId();
          const orderResp: ExOrderResp = {
            exOrderId,
            status: OrderStatus.filled,
            // rawOrder: {},
          };
          fillOrderSize(orderResp, order, orderPrice);

          await order.save();
          const currentDeal = this.strategy.currentDeal;
          currentDeal.lastOrder = order;
          currentDeal.lastOrderId = order.id;
          await currentDeal.save();
          await this.onOrderFilled();
        }
        const moved = kld.moveOrRollTime(false);
        if (!moved) {
          return false;
        }
      }
    } else {
      if (order.tpslType === 'move') {
        const { moveActivePrice, moveDrawbackPercent } = order;
      }
    }
    return true;
  }

  protected newOrderId() {
    const { id, ex } = this.strategy;
    return `${ex.toLowerCase()}${id}${Math.round(Date.now() / 1000) - 1e9}bt`;
  }

  protected async placeOrder(oppo: BacktestTradeOppo): Promise<void> {
    const { order } = oppo;
    if (!order) {
      return;
    }
    const strategy = this.strategy;
    const currentDeal = strategy.currentDeal;
    const exOrderId = this.newOrderId();
    if (order.priceType === 'market') {
      const orderResp: ExOrderResp = {
        exOrderId,
        status: OrderStatus.filled,
        rawOrder: {},
      };
      fillOrderSize(orderResp, order, oppo.orderPrice);
      await order.save();
      currentDeal.lastOrder = order;
      currentDeal.lastOrderId = order.id;
      await currentDeal.save();
      await this.onOrderFilled();
    } else {
      await order.save();
      currentDeal.pendingOrder = order;
      currentDeal.pendingOrderId = order.id;
      await currentDeal.save();
    }
    // ...
  }
}
