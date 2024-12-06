import * as _ from 'lodash';
import * as humanizeDuration from 'humanize-duration';
import { AppLogger } from '@/common/app-logger';
import { Strategy } from '@/db/models/strategy';
import { StrategyEnv, StrategyJobEnv } from '@/strategy/env/strategy-env';
import { StrategyDeal } from '@/db/models/strategy-deal';
import { TradeSide } from '@/data-service/models/base';
import { ExOrder, OrderStatus } from '@/db/models/ex-order';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';
import { MINUTE_MS, round, wait } from '@/common/utils/utils';
import {
  ExitSignal,
  MVCheckerParams,
  TradeOpportunity,
} from '@/strategy/strategy.types';
import {
  createNewDealIfNone,
  durationHumanizerOptions,
} from '@/strategy/strategy.utils';
import { ReportStatusInterval } from '@/strategy/strategy.constants';
import {
  PlaceOrderParams,
  PlaceOrderReturns,
  PlaceTpslOrderParams,
} from '@/exchange/exchange-service.types';
import { ExTradeType } from '@/db/models/exchange-types';

export abstract class BaseRunner {
  protected durationHumanizer = humanizeDuration.humanizer(
    durationHumanizerOptions,
  );

  protected constructor(
    protected readonly strategy: Strategy,
    protected env: StrategyEnv,
    protected jobEnv: StrategyJobEnv,
    protected logger: AppLogger,
  ) {}

  // return exit reason
  async run(): Promise<string> {
    let runOneDeal = false;

    const job = this.jobEnv.thisJob;
    if (job && job.data.runOneDeal) {
      runOneDeal = true;
    }
    const strategy = this.strategy;

    this.logger.log(`run strategy #${strategy.id} ...`);
    // await this.reportJobStatus('top', `run strategy #${strategy.id} ...`);

    if (!strategy.active) {
      await this.logJob(`strategy ${strategy.id} is not active`);
      return 'not active';
    }

    this.setupStrategyParams();

    await this.logJob(JSON.stringify(strategy.params, null, 2), 'params');

    while (true) {
      try {
        if (!strategy.active) {
          await this.logJob(`strategy is not active, exit ...`);
          return 'not active';
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
            return 'summit new';
          }
        }

        const opp = await this.repeatToComplete<TradeOpportunity | undefined>(
          this.checkAndWaitOpportunity.bind(this),
          { context: 'wait-opportunity' },
        );
        if (opp) {
          const sg = await Strategy.existsBy({ id: strategy.id, active: true });
          if (!sg) {
            await this.logJob(`is no active when about to place order.`);
            return 'not active';
          }
          await this.placeOrder(opp);
        }
        if (!strategy.currentDealId) {
          // deal closed due to order being filled
          await this.createNewDeal();
          if (runOneDeal) {
            await this.jobEnv.summitNewDealJob();
            return 'summit new';
          }
        }
      } catch (e) {
        if (e instanceof ExitSignal) {
          return e.message;
        }
        this.logger.error(e);
        await this.logJob(e.message);
        await wait(MINUTE_MS);
      }
    }
  }

  protected setupStrategyParams() {}

  protected abstract checkAndWaitOpportunity(): Promise<
    TradeOpportunity | undefined
  >;

  protected async placeOrder(oppo: TradeOpportunity): Promise<void> {
    const { order, params } = oppo;
    if (order && params) {
      await order.save();
      await this.doPlaceOrder(order, params);
    }
  }

  protected async doPlaceOrder(
    order: ExOrder,
    params: PlaceOrderParams | PlaceTpslOrderParams,
  ) {
    const apiKey = await this.env.ensureApiKey();
    const exService = this.env.getTradeService();

    const currentDeal = this.strategy.currentDeal;
    try {
      await this.logJob(`place order(${order.clientOrderId}) ...`);

      let result: PlaceOrderReturns;
      if (order.tpslType) {
        result = await exService.placeTpslOrder(apiKey, params);
      } else {
        result = await exService.placeOrder(apiKey, params);
      }

      ExOrder.setProps(order, result.orderResp);
      order.rawOrderParams = result.rawParams;
      await order.save();

      if (order.status === OrderStatus.filled) {
        currentDeal.lastOrder = order;
        currentDeal.lastOrderId = order.id;
        await currentDeal.save();
        await this.logJob(`order filled: ${order.side} @ ${order.execPrice}`);
        await this.onOrderFilled();
      } else if (ExOrder.orderToWait(order.status)) {
        currentDeal.pendingOrder = order;
        currentDeal.pendingOrderId = order.id;
        await currentDeal.save();
      } else {
        await this.logJob(`place order failed: ${order.status}`);
      }
    } catch (e) {
      this.logger.error(e);
      order.status = OrderStatus.summitFailed;
      await order.save();
      await this.logJob(`summit order failed`);
    }
  }

  protected async logJob(message: string, context?: string): Promise<void> {
    if (context) {
      message = `[${context}] ${message}`;
    }
    this.logger.log(message);
    const job = this.jobEnv.thisJob;
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
    const job = this.jobEnv.thisJob;
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

    // this.jobEnv.thisJob.updateProgress()
    // this.jobEnv.thisJob.progress
    // this.jobEnv.thisJob.getState()
    // TODO: job attribute:
    // const st = await Strategy.findOne({
    //   select: ['id', 'active'],
    //   where: { id: this.strategy.id },
    // });
    // if (!st || !st.active) {
    //   throw new ExitSignal('not active');
    // }
    // if (st.currentDealId) {
    //   const deal = await StrategyDeal.findOne({
    //     select: ['id', 'status'],
    //     where: { id: st.currentDealId },
    //   });
    //   if (deal?.status !== 'open') {
    //     // been canceled or closed
    //     st.currentDeal = await StrategyDeal.findOneBy({
    //       id: st.currentDealId,
    //     });
    //   }
    // }
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
        const msg = `try #${tried}, been waiting ${duration}.`;
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
      if (!currentDeal) {
        strategy.currentDealId = null;
      }
    }
    if (currentDeal && currentDeal.status !== 'open') {
      currentDeal = null;
      strategy.currentDeal = null;
      strategy.currentDealId = null;
      await strategy.save();
    }
    if (currentDeal) {
      const { lastOrderId, pendingOrderId } = currentDeal;
      if (lastOrderId) {
        currentDeal.lastOrder = await ExOrder.findOneBy({
          id: lastOrderId,
        });
        if (!currentDeal.lastOrder) {
          currentDeal.lastOrderId = null;
        }
      }
      if (currentDeal.pendingOrderId) {
        currentDeal.pendingOrder = await ExOrder.findOneBy({
          id: pendingOrderId,
        });
        if (!currentDeal.pendingOrder) {
          currentDeal.pendingOrderId = null;
        }
      }
      await currentDeal.save();
      await strategy.save();
    } else {
      await this.createNewDeal();
    }
  }

  protected async closeDeal(deal: StrategyDeal) {
    await this.logJob(`close deal ...`);

    const orders = await ExOrder.find({
      select: ['id', 'side', 'execPrice', 'execSize', 'execAmount'],
      where: { dealId: deal.id, status: OrderStatus.filled },
    });
    if (orders.length > 0) {
      const cal = (side: TradeSide) => {
        const sOrders = orders.filter((o) => o.side === side);
        if (sOrders.length === 0) {
          return [0, 0];
        }
        if (sOrders.length === 1) {
          return [sOrders[0].execSize, sOrders[0].execSize];
        }
        const size = _.sumBy(sOrders, 'execSize');
        const amount = _.sumBy(sOrders, 'execAmount');
        const avgPrice = amount / size;
        return [size, avgPrice];
      };
      const [buySize, buyAvgPrice] = cal(TradeSide.buy);
      const [sellSize, sellAvgPrice] = cal(TradeSide.sell);
      if (buySize > 0 && sellSize > 0) {
        const settleSize = Math.max(buySize, sellSize);
        // .. USD
        deal.pnlUsd = settleSize * (sellAvgPrice - buyAvgPrice);
      }
    }
    deal.status = 'closed';
    deal.closedAt = new Date();
    await deal.save();

    const strategy = this.strategy;
    if (strategy.currentDealId === deal.id) {
      strategy.lastDealId = strategy.currentDealId;
      strategy.lastDeal = strategy.currentDeal;
      strategy.currentDealId = null;
      strategy.currentDeal = null;
    }
    await strategy.save();

    await this.logJob(`deal closed.`);
  }

  protected async checkAndWaitPendingOrder(): Promise<boolean> {
    const strategy = this.strategy;
    const currentDeal = strategy.currentDeal;
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
        currentDeal.pendingOrder = null;
        currentDeal.pendingOrderId = null;
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
          await this.logJob(`order filled: ${order.side} @ ${order.execPrice}`);
        }
        await currentDeal.save();
      } else {
        // timeout
        await this.logJob(`waitForOrder - timeout`);
        await this.env.trySynchronizeOrder(pendingOrder);
        if (ExOrder.orderFinished(pendingOrder.status)) {
          currentDeal.lastOrder = pendingOrder;
          currentDeal.pendingOrder = null;
          currentDeal.pendingOrderId = null;
          await currentDeal.save();
          await this.logJob(`synchronize-order - filled`);
        } else {
          if (await this.shouldCancelOrder(pendingOrder)) {
            await this.env.ensureApiKey();
            const exService = this.env.getTradeService();
            await exService.cancelOrder(strategy.apiKey, {
              symbol: strategy.symbol,
              orderId: pendingOrder.exOrderId,
            });
          }
          await this.logJob(`synchronize-order - not filled`);
          return false;
        }
      }
    }
    currentDeal.pendingOrder = null;
    currentDeal.pendingOrderId = null;

    await this.onOrderFilled();

    return true;
  }

  protected async shouldCancelOrder(pendingOrder: ExOrder): Promise<boolean> {
    return false;
  }

  protected shouldCloseDeal(currentDeal: StrategyDeal): boolean {
    return !currentDeal.pendingOrderId && !!currentDeal.lastOrder;
  }

  protected async onOrderFilled() {
    const currentDeal = this.strategy.currentDeal;
    if (!this.shouldCloseDeal(currentDeal)) {
      return;
    }

    await this.closeDeal(currentDeal);
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

  protected inverseSide(side: TradeSide): TradeSide {
    return side === TradeSide.buy ? TradeSide.sell : TradeSide.buy;
  }

  protected newClientOrderId(orderTag?: string): string {
    const { id, algoCode } = this.strategy;
    const code = algoCode.toLowerCase();
    const ms = '' + Date.now();
    const tag = orderTag?.replace(/[^a-zA-Z]/, '')?.toLowerCase() || '';
    return `${code}${id}${ms.substring(1, 10)}${tag}`;
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
    exOrder.tradeType = strategy.tradeType;
    exOrder.paperTrade = strategy.paperTrade;
    return exOrder;
  }

  protected async buildMarketOrder(oppo: TradeOpportunity): Promise<void> {
    const exSymbol = await this.ensureExchangeSymbol();

    const unifiedSymbol = exSymbol.unifiedSymbol;
    const strategy = this.strategy;
    const tradeSide = oppo.side;
    const clientOrderId = this.newClientOrderId(oppo.orderTag);

    const params: PlaceOrderParams = {
      side: tradeSide,
      symbol: strategy.rawSymbol,
      priceType: 'market',
      clientOrderId,
      algoOrder: false,
    };

    if (strategy.tradeType === ExTradeType.margin) {
      params.marginMode = 'cross';
      params.marginCoin = unifiedSymbol.quote;
    }

    const size = strategy.baseSize;
    const quoteAmount = strategy.quoteAmount || 200;
    if (size) {
      params.baseSize = round(size, exSymbol.baseSizeDigits);
    } else {
      params.quoteAmount = quoteAmount.toFixed(2);
    }

    const order = this.newOrderByStrategy();
    order.tag = oppo.orderTag;
    order.side = tradeSide;
    order.status = OrderStatus.notSummited;
    order.clientOrderId = clientOrderId;
    order.priceType = params.priceType;
    if (size) {
      order.baseSize = size;
    }
    order.quoteAmount = size ? undefined : quoteAmount;
    order.algoOrder = false;
    order.memo = oppo.memo;

    oppo.order = order;
    oppo.params = params;
  }

  protected async buildLimitOrder(oppo: TradeOpportunity): Promise<void> {
    const exSymbol = await this.ensureExchangeSymbol();

    const unifiedSymbol = exSymbol.unifiedSymbol;
    const strategy = this.strategy;
    const tradeSide = oppo.side;
    const clientOrderId = this.newClientOrderId(oppo.orderTag);

    const orderPrice = oppo.orderPrice;

    const params: PlaceOrderParams = {
      side: tradeSide,
      symbol: strategy.rawSymbol,
      priceType: 'limit',
      clientOrderId,
      algoOrder: false,
    };

    if (strategy.tradeType === ExTradeType.margin) {
      params.marginMode = 'cross';
      params.marginCoin = unifiedSymbol.quote;
    }

    let size = strategy.baseSize;
    const quoteAmount = strategy.quoteAmount || 200;
    if (!size) {
      if (orderPrice) {
        size = quoteAmount / orderPrice;
      }
    }

    const order = this.newOrderByStrategy();
    order.tag = oppo.orderTag;
    order.side = tradeSide;
    order.status = OrderStatus.notSummited;
    order.clientOrderId = clientOrderId;
    order.priceType = params.priceType;
    order.limitPrice = orderPrice;
    if (size) {
      order.baseSize = size;
    }
    order.quoteAmount = size ? undefined : quoteAmount;
    order.algoOrder = false;
    order.memo = oppo.memo;

    oppo.order = order;
    oppo.params = params;
  }

  protected async buildMarketOrLimitOrder(
    oppo: TradeOpportunity,
  ): Promise<void> {
    if (oppo.order) {
      return this.buildLimitOrder(oppo);
    }
    return this.buildMarketOrder(oppo);
  }

  protected async buildMoveTpslOrder(
    oppo: TradeOpportunity,
    rps: MVCheckerParams,
  ): Promise<void> {
    const exSymbol = await this.ensureExchangeSymbol();

    const unifiedSymbol = exSymbol.unifiedSymbol;
    const strategy = this.strategy;

    const { activePercent, drawbackPercent } = rps;
    let placeOrderPrice = oppo.orderPrice;
    const tradeSide = oppo.side;

    let activePrice: number;

    if (activePercent) {
      const activeRatio = activePercent / 100;
      if (!placeOrderPrice) {
        placeOrderPrice = await this.env.getLastPrice();
      }
      if (tradeSide === TradeSide.buy) {
        activePrice = placeOrderPrice * (1 - activeRatio);
      } else {
        activePrice = placeOrderPrice * (1 + activeRatio);
      }
    }

    let size = strategy.baseSize;
    const quoteAmount = strategy.quoteAmount || 200;
    if (!size) {
      if (activePrice) {
        size = quoteAmount / activePrice;
      } else {
        if (!placeOrderPrice) {
          placeOrderPrice = await this.env.getLastPrice();
        }
        size = quoteAmount / placeOrderPrice;
      }
    }

    const clientOrderId = this.newClientOrderId(oppo.orderTag);

    const params: PlaceTpslOrderParams = {
      side: tradeSide,
      symbol: strategy.rawSymbol,
      priceType: 'limit',
      clientOrderId,
      algoOrder: true,
    };

    if (strategy.tradeType === ExTradeType.margin) {
      params.marginMode = 'cross';
      params.marginCoin = unifiedSymbol.quote;
    }

    params.tpslType = 'move';
    params.baseSize = round(size, exSymbol.baseSizeDigits);
    params.moveDrawbackRatio = (drawbackPercent / 100).toFixed(4);
    if (activePrice) {
      const priceDigits = exSymbol.priceDigits;
      params.moveActivePrice = round(activePrice, priceDigits);
    }

    const order = this.newOrderByStrategy();
    order.tag = oppo.orderTag;
    order.side = tradeSide;
    order.status = OrderStatus.notSummited;
    order.clientOrderId = clientOrderId;
    order.priceType = params.priceType;
    if (size) {
      order.baseSize = size;
    }
    order.quoteAmount = size ? undefined : quoteAmount;
    order.algoOrder = true;
    order.tpslType = params.tpslType;
    order.moveDrawbackPercent = drawbackPercent;
    if (activePrice) {
      order.moveActivePrice = activePrice;
    }
    order.memo = oppo.memo;

    oppo.order = order;
    oppo.params = params;
  }
}
