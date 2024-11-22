import * as _ from 'lodash';
import * as humanizeDuration from 'humanize-duration';
import { AppLogger } from '@/common/app-logger';
import { Strategy } from '@/db/models/strategy';
import { StrategyEnv, StrategyJobEnv } from '@/trade-strategy/env/strategy-env';
import { StrategyDeal } from '@/db/models/strategy-deal';
import { TradeSide } from '@/data-service/models/base';
import { ExOrder, OrderStatus } from '@/db/models/ex-order';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';
import { HOUR_MS, MINUTE_MS, wait } from '@/common/utils/utils';
import { WatchLevel } from '@/trade-strategy/strategy.types';
import { WatchRtPriceParams } from '@/data-ex/ex-public-ws.service';
import { createNewDealIfNone } from '@/trade-strategy/strategy.utils';
import {
  IntenseWatchExitThreshold,
  IntenseWatchThreshold,
  ReportStatusInterval,
} from '@/trade-strategy/strategy.constants';

class ExitSignal extends Error {}

export abstract class BaseRunner {
  protected durationHumanizer = humanizeDuration.humanizer({
    language: 'shortEn',
    languages: {
      shortEn: {
        y: () => 'y',
        mo: () => 'mo',
        w: () => 'w',
        d: () => 'd',
        h: () => 'h',
        m: () => 'm',
        s: () => 's',
        ms: () => 'ms',
      },
    },
  });

  protected constructor(
    protected readonly strategy: Strategy,
    protected env: StrategyEnv,
    protected jobEnv: StrategyJobEnv,
    protected logger: AppLogger,
  ) {}

  async run() {
    let runOneDeal = false;

    const job = this.jobEnv.getThisJob();
    if (job && job.data.runOneDeal) {
      runOneDeal = true;
    }
    const strategy = this.strategy;

    await this.logJob(`run strategy #${strategy.id} ...`);
    // await this.reportJobStatus('top', `run strategy #${strategy.id} ...`);

    if (!strategy.active) {
      await this.logJob(`strategy ${strategy.id} is not active`);
      return;
    }

    this.setDefaultStrategyParams();
    strategy.runtimeParams = {};

    while (true) {
      try {
        if (!strategy.active) {
          this.logger.log(`strategy ${strategy.id} is not active, exit ...`);
          break;
        }

        await this.checkCommands();

        await this.loadOrCreateDeal();

        await this.repeatToComplete(this.checkAndWaitPendingOrder.bind(this), {
          context: 'wait-pending-order',
        });

        if (!strategy.currentDealId) {
          // deal closed due to order being filled
          await this.createNewDeal();
          if (runOneDeal) {
            await this.jobEnv.summitNewDealJob();
            break;
          }
        }

        await this.resetRuntimeParams();

        const opp = await this.repeatToComplete(
          this.checkAndWaitOpportunity.bind(this),
          { context: 'wait-opportunity' },
        );
        if (opp.placeOrder) {
          await this.placeOrder();
          if (!strategy.currentDealId) {
            // deal closed due to order being filled
            await this.createNewDeal();
            if (runOneDeal) {
              await this.jobEnv.summitNewDealJob();
              break;
            }
          }
        }
      } catch (e) {
        if (e instanceof ExitSignal) {
          throw e;
        }
        this.logger.error(e);
        await this.logJob(e.message, 'run()');
        await wait(MINUTE_MS);
      }
    }
  }

  protected setDefaultStrategyParams() {}

  protected abstract resetRuntimeParams(): Promise<void>;

  protected abstract checkAndWaitOpportunity(): Promise<{
    placeOrder?: boolean;
  }>;

  protected abstract placeOrder(): Promise<void>;

  protected evalWatchLevel(diffPercentAbs: number): WatchLevel {
    let watchLevel: WatchLevel;
    if (diffPercentAbs <= IntenseWatchThreshold) {
      watchLevel = 'intense';
    } else if (diffPercentAbs <= 0.5) {
      watchLevel = 'high';
    } else if (diffPercentAbs < 1) {
      watchLevel = 'medium';
    } else if (diffPercentAbs < 2) {
      watchLevel = 'loose';
    } else if (diffPercentAbs < 5) {
      watchLevel = 'snap';
    } else if (diffPercentAbs < 10) {
      watchLevel = 'sleep';
    } else {
      watchLevel = 'hibernate';
    }
    return watchLevel;
  }

  protected async waitForWatchLevel(
    watchLevel: WatchLevel,
    lastPrice: number,
    targetPrice: number,
    logContext: string,
  ): Promise<boolean> {
    switch (watchLevel) {
      case 'intense':
        let watchRtPriceParams: WatchRtPriceParams;
        const toBuy = this.strategy.nextTradeSide === TradeSide.buy;
        if (toBuy) {
          watchRtPriceParams = {
            lowerBound: targetPrice,
            upperBound: lastPrice * (1 + IntenseWatchExitThreshold / 100),
          };
        } else {
          watchRtPriceParams = {
            lowerBound: lastPrice * (1 - IntenseWatchExitThreshold / 100),
            upperBound: targetPrice,
          };
        }
        const result = await this.env.watchRtPrice({
          ...watchRtPriceParams,
          timeoutSeconds: 10 * 60,
        });

        if (result.timeout) {
          await this.logJob(`timeout, ${result.price}(last)`, logContext);
          return false;
        }
        if (toBuy) {
          if (result.reachLower) {
            await this.logJob(`reachLower, ${result.price}(last)`, logContext);
            return true;
          }
        } else {
          if (result.reachUpper) {
            await this.logJob(`reachUpper, ${result.price}(last)`, logContext);
            return true;
          }
        }
        break;
      case 'high':
        // await this.logJob(`wait 5s`, logContext);
        await wait(5 * 1000);
        break;
      case 'medium':
        // await this.logJob(`wait 20s`, logContext);
        await wait(20 * 1000);
        break;
      case 'loose':
        await this.logJob(`wait 1m`, logContext);
        await wait(MINUTE_MS);
        break;
      case 'snap':
        await this.logJob(`wait 5m`, logContext);
        await wait(5 * MINUTE_MS);
        break;
      case 'sleep':
        await this.logJob(`wait 30m`, logContext);
        await wait(30 * MINUTE_MS);
        break;
      case 'hibernate':
        await this.logJob(`wait 2h`, logContext);
        await wait(2 * HOUR_MS);
        break;
    }
    return false;
  }

  protected async logJob(message: string, context?: string): Promise<void> {
    if (context) {
      message = `[${context}] ${message}`;
    }
    this.logger.log(message);
    const job = this.jobEnv.getThisJob();
    if (job) {
      await job
        .log(`${new Date().toISOString()} ${message}`)
        .catch((err: Error) => {
          this.logger.error(err);
        });
    }
  }

  protected async reportJobStatus(
    context: string,
    status: string,
  ): Promise<void> {
    this.logger.log(`[${context}] ${status}`);
    const job = this.jobEnv.getThisJob();
    if (job) {
      await job.updateProgress({ [context]: status }).catch((err: Error) => {
        this.logger.error(err);
      });
    }
  }

  protected async checkCommands() {
    const paused = await this.jobEnv.queuePaused();
    if (paused) {
      throw new ExitSignal('queue paused');
    }

    const st = await Strategy.findOne({
      select: ['id', 'active'],
      where: { id: this.strategy.id },
    });
    if (!st || !st.active) {
      throw new ExitSignal('not active');
    }
  }

  protected async repeatToComplete<T = any>(
    action: () => Promise<T | undefined>,
    options: {
      context: string;
      maxTry?: number;
      maxWait?: number;
      waitOnFailed?: number;
    },
  ): Promise<T | undefined> {
    const strategy = this.strategy;
    let tried = 0;
    let waited = 0;
    while (true) {
      tried++;
      const start = Date.now();
      const hd = setInterval(() => {
        const ms = Date.now() - start;
        const duration = this.durationHumanizer(ms, { round: true });
        const msg = `try #${tried}, been waited ${duration}.`;
        this.logJob(msg, options.context);
      }, ReportStatusInterval);
      try {
        const result = await action();
        if (result) {
          return result;
        }
        await this.checkCommands();
      } catch (e) {
        if (e instanceof ExitSignal) {
          throw e;
        }
        this.logger.error(e);
        await this.logJob(e.message, options.context);
        if (options.maxTry && tried >= options.maxTry) {
          return undefined;
        }
        const toWait = options.waitOnFailed || MINUTE_MS;
        if (options.maxWait && waited + toWait >= options.maxWait) {
          return undefined;
        }
        const duration = this.durationHumanizer(toWait, { round: true });
        await this.logJob(`to wait ${duration}.`, options.context);
        await wait(toWait);
        waited += toWait;
        if (!strategy.active) {
          await this.logJob(
            `strategy is not active, exit ...`,
            options.context,
          );
          return undefined;
        }
      } finally {
        clearInterval(hd);
      }
    }
  }

  protected newDealSide(): TradeSide {
    return TradeSide.buy;
  }

  protected async createNewDeal() {
    await createNewDealIfNone(this.strategy);
  }

  protected async loadOrCreateDeal() {
    const strategy = this.strategy;
    let currentDeal: StrategyDeal;
    if (strategy.currentDealId) {
      currentDeal = await StrategyDeal.findOneBy({
        id: strategy.currentDealId,
      });
      strategy.currentDeal = currentDeal;
    }
    if (currentDeal) {
      if (currentDeal.status !== 'open') {
        currentDeal = undefined;
        strategy.currentDeal = undefined;
        strategy.currentDealId = undefined;
      }
      const { lastOrderId, pendingOrderId } = currentDeal;
      if (lastOrderId) {
        currentDeal.lastOrder = await ExOrder.findOneBy({
          id: lastOrderId,
        });
      }
      if (currentDeal.pendingOrderId) {
        currentDeal.pendingOrder = await ExOrder.findOneBy({
          id: pendingOrderId,
        });
      }
    } else {
      await this.createNewDeal();
    }
  }

  protected async closeDeal(deal: StrategyDeal) {
    const orders = await ExOrder.find({
      select: ['id', 'side', 'execPrice', 'execSize', 'execAmount'],
      where: { dealId: deal.id, status: OrderStatus.filled },
    });
    const cal = (side: TradeSide) => {
      const sideOrders = orders.filter((o) => o.side === side);
      if (sideOrders.length === 1) {
        return [sideOrders[0].execSize, sideOrders[0].execSize];
      }
      const size = _.sumBy(sideOrders, 'execSize');
      const amount = _.sumBy(sideOrders, 'execAmount');
      const avgPrice = amount / size;
      return [size, avgPrice];
    };
    const [buySize, buyAvgPrice] = cal(TradeSide.buy);
    const [sellSize, sellAvgPrice] = cal(TradeSide.sell);
    const settleSize = Math.max(buySize, sellSize);
    // .. USD
    deal.pnlUsd = settleSize * (sellAvgPrice - buyAvgPrice);
    deal.status = 'closed';
    await deal.save();

    this.strategy.currentDealId = undefined;
    this.strategy.currentDeal = undefined;
    await this.strategy.save();
  }

  protected async checkAndWaitPendingOrder(): Promise<boolean> {
    const currentDeal = this.strategy.currentDeal;
    if (!currentDeal?.pendingOrder) {
      return true;
    }
    if (ExOrder.orderFinished(currentDeal.pendingOrder.status)) {
      currentDeal.lastOrder = currentDeal.pendingOrder;
      await currentDeal.save();
    } else {
      const pendingOrder = currentDeal.pendingOrder;
      if (pendingOrder.status === OrderStatus.notSummited) {
        // discard
        currentDeal.pendingOrder = undefined;
        currentDeal.pendingOrderId = undefined;
        await currentDeal.save();
        return true;
      }
      // check is market price
      const waitSeconds = pendingOrder.priceType === 'market' ? 8 : 10 * 60;
      const order = await this.env.waitForOrder(pendingOrder, waitSeconds);
      if (order) {
        // finished
        if (order.status === OrderStatus.filled) {
          currentDeal.lastOrder = order;
          currentDeal.lastOrderId = order.id;
          await this.logJob(`order filled`);
        }
        await currentDeal.save();
      } else {
        // timeout
        await this.logJob(`waitForOrder - timeout`);
        await this.env.trySynchronizeOrder(pendingOrder);
        if (ExOrder.orderFinished(pendingOrder.status)) {
          currentDeal.lastOrder = pendingOrder;
          currentDeal.pendingOrder = undefined;
          currentDeal.pendingOrderId = undefined;
          await currentDeal.save();
          await this.logJob(`synchronize-order - filled`);
        } else {
          // TODO:
          await this.logJob(`synchronize-order - not filled`);
          return false;
        }
      }
    }
    currentDeal.pendingOrder = undefined;
    currentDeal.pendingOrderId = undefined;

    await this.onOrderFilled();

    return true;
  }

  protected async onOrderFilled() {
    const currentDeal = this.strategy.currentDeal;
    const lastOrder = currentDeal.lastOrder;
    if (
      !lastOrder ||
      lastOrder.status !== OrderStatus.filled ||
      lastOrder.side === this.newDealSide()
    ) {
      return;
    }

    await this.logJob(`close deal ...`);

    await this.closeDeal(currentDeal);

    await this.logJob(`deal closed.`);

    await this.createNewDeal();
  }

  protected async ensureExchangeSymbol() {
    const strategy = this.strategy;
    if (!strategy.exchangeSymbol) {
      strategy.exchangeSymbol = await ExchangeSymbol.findOne({
        where: {
          ex: strategy.ex,
          symbol: strategy.symbol,
        },
        relations: ['unifiedSymbol'],
      });
    }
    return strategy.exchangeSymbol;
  }

  protected newClientOrderId(): string {
    const code = this.strategy.algoCode.toLowerCase();
    return `${code}${Math.round(Date.now() / 1000) - 1e9}`;
  }

  protected newOrderByStrategy(): ExOrder {
    const strategy = this.strategy;
    const exOrder = new ExOrder();
    exOrder.ex = strategy.ex;
    exOrder.market = strategy.market;
    exOrder.baseCoin = strategy.baseCoin;
    exOrder.symbol = strategy.symbol;
    exOrder.rawSymbol = strategy.rawSymbol;
    exOrder.userExAccountId = strategy.userExAccountId;
    exOrder.strategyId = strategy.id;
    exOrder.dealId = strategy.currentDealId;
    exOrder.side = strategy.nextTradeSide;
    exOrder.tradeType = strategy.tradeType;
    exOrder.paperTrade = strategy.paperTrade;
    return exOrder;
  }
}
