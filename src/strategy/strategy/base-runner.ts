import * as _ from 'lodash';
import * as humanizeDuration from 'humanize-duration';
import { AppLogger } from '@/common/app-logger';
import { Strategy } from '@/db/models/strategy/strategy';
import { StrategyEnv, StrategyJobEnv } from '@/strategy/env/strategy-env';
import { StrategyDeal } from '@/db/models/strategy/strategy-deal';
import { TradeSide } from '@/data-service/models/base';
import { ExOrder, OrderStatus } from '@/db/models/ex-order';
import { ExchangeSymbol } from '@/db/models/ex/exchange-symbol';
import { MINUTE_MS, round, wait } from '@/common/utils/utils';
import {
  ExitSignal,
  MVCheckerParams,
  TradeOpportunity,
} from '@/strategy/strategy.types';
import {
  createNewDealIfNone,
  durationHumanizerOptions,
  evalOrdersPnl,
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
            await this.logJob(`not active when about to place order.`);
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
        this.logger.error(e, e.stack);
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
    const { order, params, orderSize, orderAmount, orderPrice } = oppo;
    if (!order || !params) {
      return;
    }
    const strategy = this.strategy;
    if (order.side === TradeSide.buy) {
      if (!order.quoteAmount) {
        order.quoteAmount = orderAmount || strategy.quoteAmount;
      }
    } else {
      if (!order.baseSize && orderSize) {
        order.baseSize = orderSize;
      }
      if (!order.baseSize) {
        const amount = orderAmount || strategy.quoteAmount;
        order.baseSize = amount / orderPrice;
      }
    }
    await order.save();
    await this.doPlaceOrder(order, params);
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
      this.logger.error(e, e.stack);
      order.status = OrderStatus.summitFailed;
      await order.save();
      await this.logJob(`summit order failed: ${e.message}`);
      await wait(MINUTE_MS);
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
        this.logger.error(e, e.stack);
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
    deal.pnlUsd = evalOrdersPnl(orders);
    deal.status = 'closed';
    deal.closedAt = new Date();
    if (deal.openAt) {
      const msSpan = deal.closedAt.getTime() - deal.openAt.getTime();
      deal.dealDuration = this.durationHumanizer(msSpan, { round: true });
    }
    deal.ordersCount = orders.length;
    deal.closeReason = deal.lastOrder?.tag;
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
    const pendingOrder = currentDeal.pendingOrder;
    if (
      pendingOrder.status === OrderStatus.notSummited ||
      pendingOrder.status === OrderStatus.canceled
    ) {
      currentDeal.pendingOrder = null;
      currentDeal.pendingOrderId = null;
      await currentDeal.save();
      return true;
    }
    if (
      ExOrder.orderFinished(pendingOrder.status) &&
      !ExOrder.orderFilled(pendingOrder.status)
    ) {
      currentDeal.pendingOrder = null;
      currentDeal.pendingOrderId = null;
      await currentDeal.save();
      return true;
    }

    if (ExOrder.orderFilled(pendingOrder.status)) {
      currentDeal.lastOrder = pendingOrder;
      currentDeal.lastOrderId = pendingOrder.id;
    } else {
      // check is market price
      const waitSeconds = pendingOrder.priceType === 'market' ? 8 : 10 * 60;
      const order = await this.env.waitForOrder(pendingOrder, waitSeconds);
      if (order) {
        // finished
        if (ExOrder.orderFilled(order.status)) {
          currentDeal.lastOrder = order;
          currentDeal.lastOrderId = order.id;
          await this.logJob(`order filled: ${order.side} @ ${order.execPrice}`);
        }
        // await currentDeal.save();
      } else {
        // timeout
        await this.logJob(`waitForOrder - timeout`);
        if (!pendingOrder.exOrderId && pendingOrder.rawOrder?.algoId) {
          pendingOrder.exOrderId = pendingOrder.rawOrder?.algoId;
        }
        if (pendingOrder.exOrderId) {
          await this.env.trySynchronizeOrder(pendingOrder);
        }
        if (ExOrder.orderFilled(pendingOrder.status)) {
          currentDeal.lastOrder = pendingOrder;
          currentDeal.lastOrderId = pendingOrder.id;
          await this.logJob(`synchronize-order - filled`);
        } else {
          await this.logJob(`synchronize-order - not filled`);
          if (await this.shouldCancelOrder(pendingOrder)) {
            await this.env.ensureApiKey();
            const exService = this.env.getTradeService();
            await exService.cancelOrder(strategy.apiKey, {
              symbol: strategy.symbol,
              orderId: pendingOrder.exOrderId,
            });
            currentDeal.pendingOrder = null;
            currentDeal.pendingOrderId = null;
            await currentDeal.save();
            await this.logJob(`cancel order ...`);
          }
          return false;
        }
      }
    }
    currentDeal.pendingOrder = null;
    currentDeal.pendingOrderId = null;
    await currentDeal.save();

    await this.onOrderFilled();

    return true;
  }

  protected async shouldCancelOrder(pendingOrder: ExOrder): Promise<boolean> {
    return false;
  }

  protected shouldCloseDeal(currentDeal: StrategyDeal): boolean {
    return (
      !currentDeal.pendingOrderId &&
      currentDeal.lastOrder &&
      currentDeal.lastOrder.tag !== 'open'
    );
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
    const { id, openAlgo } = this.strategy;
    // const code = algoCode.toLowerCase();
    const oc = openAlgo.toLowerCase();
    const ms = '' + Date.now();
    const tag = orderTag?.replace(/[^a-zA-Z]/, '')?.toLowerCase() || '';
    return `${oc}${id}${ms.substring(1, 10)}${tag}`;
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

    const order = this.newOrderByStrategy();
    order.tag = oppo.orderTag;
    order.side = tradeSide;
    order.status = OrderStatus.notSummited;
    order.clientOrderId = clientOrderId;
    order.priceType = 'market';
    order.quoteAmount = oppo.orderAmount || strategy.quoteAmount;
    order.baseSize = oppo.orderSize || strategy.baseSize;
    if (!order.baseSize) {
      const lastPrice = await this.env.getLastPrice();
      const qa = oppo.orderAmount || strategy.quoteAmount;
      order.baseSize = qa / lastPrice;
    }
    order.algoOrder = false;
    order.memo = oppo.memo;

    const params: PlaceOrderParams = {
      side: tradeSide,
      symbol: strategy.rawSymbol,
      priceType: order.priceType,
      clientOrderId,
      algoOrder: false,
    };

    if (strategy.tradeType === ExTradeType.margin) {
      params.marginMode = 'cross';
      params.marginCoin = unifiedSymbol.quote;
    }

    if (order.quoteAmount) {
      params.quoteAmount = order.quoteAmount.toFixed(2);
    }
    if (order.baseSize) {
      params.baseSize = round(order.baseSize, exSymbol.baseSizeDigits);
    }

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

    const order = this.newOrderByStrategy();
    order.tag = oppo.orderTag;
    order.side = tradeSide;
    order.status = OrderStatus.notSummited;
    order.clientOrderId = clientOrderId;
    order.priceType = 'limit';
    order.limitPrice = orderPrice;
    order.quoteAmount = oppo.orderAmount || strategy.quoteAmount;
    order.baseSize = oppo.orderSize || strategy.baseSize;
    if (!order.baseSize) {
      const qa = oppo.orderAmount || strategy.quoteAmount;
      order.baseSize = qa / orderPrice;
    }
    order.algoOrder = false;
    order.memo = oppo.memo;

    let priceStr = '';
    const priceDigits = exSymbol.priceDigits;
    if (priceDigits != null) {
      priceStr = round(order.limitPrice, priceDigits);
    } else {
      priceStr = order.limitPrice.toString(5);
    }

    const params: PlaceOrderParams = {
      side: tradeSide,
      symbol: strategy.rawSymbol,
      priceType: order.priceType,
      price: priceStr,
      clientOrderId,
      algoOrder: false,
    };

    if (strategy.tradeType === ExTradeType.margin) {
      params.marginMode = 'cross';
      params.marginCoin = unifiedSymbol.quote;
    }

    if (order.quoteAmount) {
      params.quoteAmount = order.quoteAmount.toFixed(2);
    }
    if (order.baseSize) {
      params.baseSize = round(order.baseSize, exSymbol.baseSizeDigits);
    }

    oppo.order = order;
    oppo.params = params;
  }

  protected async buildMarketOrLimitOrder(
    oppo: TradeOpportunity,
  ): Promise<void> {
    if (oppo.orderPrice) {
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
    const placeOrderPrice = oppo.orderPrice;
    const tradeSide = oppo.side;

    const clientOrderId = this.newClientOrderId(oppo.orderTag);

    const order = this.newOrderByStrategy();
    order.tag = oppo.orderTag;
    order.side = tradeSide;
    order.status = OrderStatus.notSummited;
    order.clientOrderId = clientOrderId;
    order.priceType = 'limit';
    order.algoOrder = true;
    order.tpslType = 'move';
    order.moveDrawbackPercent = drawbackPercent;
    order.quoteAmount = oppo.orderAmount || strategy.quoteAmount;
    order.baseSize = oppo.orderSize || strategy.baseSize;
    if (!order.baseSize) {
      const qa = oppo.orderAmount || strategy.quoteAmount;
      order.baseSize = qa / placeOrderPrice; // FIXME
    }
    if (activePercent) {
      const activeRatio = activePercent / 100;
      if (tradeSide === TradeSide.buy) {
        order.moveActivePrice = placeOrderPrice * (1 - activeRatio);
      } else {
        order.moveActivePrice = placeOrderPrice * (1 + activeRatio);
      }
    }
    order.memo = oppo.memo;

    const params: PlaceTpslOrderParams = {
      side: tradeSide,
      symbol: strategy.rawSymbol,
      priceType: order.priceType,
      clientOrderId,
      algoOrder: true,
    };

    if (strategy.tradeType === ExTradeType.margin) {
      params.marginMode = 'cross';
      params.marginCoin = unifiedSymbol.quote;
    }

    params.tpslType = order.tpslType;
    if (order.quoteAmount) {
      params.quoteAmount = order.quoteAmount.toFixed(2);
    }
    if (order.baseSize) {
      params.baseSize = round(order.baseSize, exSymbol.baseSizeDigits);
    }
    params.moveDrawbackRatio = (drawbackPercent / 100).toFixed(4);
    if (order.moveActivePrice) {
      const priceDigits = exSymbol.priceDigits;
      params.moveActivePrice = round(order.moveActivePrice, priceDigits);
    }

    oppo.order = order;
    oppo.params = params;
  }
}
