import { Strategy } from '@/db/models/strategy';
import { AppLogger } from '@/common/app-logger';
import { TradeSide } from '@/data-service/models/base';
import { ExOrder, OrderStatus } from '@/db/models/ex-order';
import { BaseRunner } from '@/trade-strategy/strategy/base-runner';
import { StrategyEnv, StrategyJobEnv } from '@/trade-strategy/env/strategy-env';
import { evalDiffPercent, round } from '@/common/utils/utils';
import { PlaceTpslOrderParams } from '@/exchange/exchange-service-types';
import { ExTradeType } from '@/db/models/exchange-types';
import { MVStartupParams } from '@/trade-strategy/strategy.types';

interface RuntimeParams {
  startingPrice?: number;
  placeOrderPrice?: number;
  activePrice?: number;
}

export class MoveTracing extends BaseRunner {
  constructor(
    protected strategy: Strategy,
    protected env: StrategyEnv,
    protected jobEnv: StrategyJobEnv,
    protected logger: AppLogger,
  ) {
    super(strategy, env, jobEnv, logger);
  }

  protected setDefaultStrategyParams() {
    const strategy = this.strategy;
    if (!strategy.params) {
      strategy.params = {
        waitForPercent: 2,
        drawbackPercent: 2,
      } as MVStartupParams;
    }
  }

  protected newDealSide(): TradeSide {
    const params = this.strategy.params as MVStartupParams;
    if (params.newDealTradeSide) {
      return params.newDealTradeSide;
    }
    return super.newDealSide();
  }

  protected async resetRuntimeParams() {
    const strategy = this.strategy;
    const currentDeal = strategy.currentDeal!;
    const lastOrder = currentDeal.lastOrder;

    if (lastOrder) {
      const lastSide = strategy.nextTradeSide;
      strategy.nextTradeSide =
        lastOrder.side === TradeSide.buy ? TradeSide.sell : TradeSide.buy;
      if (lastSide !== strategy.nextTradeSide) {
        await this.resetStartingPrice(lastOrder.execPrice);
      }
    } else {
      strategy.nextTradeSide = this.newDealSide();
    }
    const runtimeParams = strategy.runtimeParams as RuntimeParams;
    if (!runtimeParams.startingPrice) {
      const startingPrice = await this.env.getLastPrice();
      await this.resetStartingPrice(startingPrice);
    }
    await strategy.save();
  }

  protected async resetStartingPrice(startingPrice: number) {
    const strategy = this.strategy;
    const runtimeParams: RuntimeParams = (strategy.runtimeParams = {});
    runtimeParams.startingPrice = startingPrice;
    const strategyParams: MVStartupParams = strategy.params;
    const wfp = strategyParams.waitForPercent;
    if (!wfp) {
      return;
    }
    const ratio =
      strategy.nextTradeSide === TradeSide.buy ? 1 - wfp / 100 : 1 + wfp / 100;
    runtimeParams.placeOrderPrice = runtimeParams.startingPrice * ratio;
    await this.logJob(`placeOrderPrice: ${runtimeParams.placeOrderPrice}`);
  }

  protected async checkAndWaitOpportunity(): Promise<{
    placeOrder?: boolean;
  }> {
    const strategy = this.strategy;
    const runtimeParams: RuntimeParams = strategy.runtimeParams;

    while (true) {
      const lastPrice = await this.env.getLastPrice();

      if (!runtimeParams.placeOrderPrice) {
        runtimeParams.placeOrderPrice = lastPrice;
        await this.logJob('no `placeOrderPrice`, place order now');
        return { placeOrder: true };
      }

      const placeOrderPrice = runtimeParams.placeOrderPrice;

      if (strategy.nextTradeSide === TradeSide.buy) {
        if (lastPrice <= placeOrderPrice) {
          await this.logJob(`reach, to buy`);
          return { placeOrder: true };
        }
      } else {
        if (lastPrice >= placeOrderPrice) {
          await this.logJob(`reach, to sell`);
          return { placeOrder: true };
        }
      }
      const logContext =
        strategy.nextTradeSide === TradeSide.buy ? 'wait-up' : 'wait-down';

      const diffPercent = evalDiffPercent(lastPrice, placeOrderPrice);
      const diffPercentAbs = Math.abs(diffPercent);

      const watchLevel = this.evalWatchLevel(diffPercentAbs);
      const lps = lastPrice.toPrecision(6);
      const tps = placeOrderPrice.toPrecision(6);
      await this.logJob(
        `watch level: ${watchLevel}, ${lps}(last) -> ${tps}, ${diffPercent.toFixed(4)}%`,
        logContext,
      );

      const reachPrice = await this.waitForWatchLevel(
        watchLevel,
        lastPrice,
        placeOrderPrice,
        logContext,
      );
      if (reachPrice) {
        return { placeOrder: true };
      }

      await this.checkCommands();
    }
  }

  protected async placeOrder() {
    const exSymbol = await this.ensureExchangeSymbol();
    const apiKey = await this.env.ensureApiKey();
    const exService = this.env.getTradeService();

    const unifiedSymbol = exSymbol.unifiedSymbol;
    const strategy = this.strategy;
    const currentDeal = strategy.currentDeal;

    const strategyParams: MVStartupParams = strategy.params;
    const { activePercent, drawbackPercent } = strategyParams;
    const runtimeParams: RuntimeParams = strategy.runtimeParams;

    const tradeSide = strategy.nextTradeSide;
    let size = strategy.baseSize;

    const placeOrderPrice = runtimeParams.placeOrderPrice;
    let activePrice: number;

    if (activePercent) {
      const activeRatio = activePercent / 100;
      if (tradeSide === TradeSide.buy) {
        activePrice = placeOrderPrice * (1 - activeRatio);
      } else {
        activePrice = placeOrderPrice * (1 + activeRatio);
      }
    }

    const quoteAmount = strategy.quoteAmount || 200;
    if (!size) {
      if (activePrice) {
        size = quoteAmount / activePrice;
      } else {
        size = quoteAmount / placeOrderPrice;
      }
    }

    const clientOrderId = this.newClientOrderId();

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
    order.status = OrderStatus.notSummited;
    order.clientOrderId = clientOrderId;
    order.priceType = params.priceType;
    order.baseSize = size;
    order.quoteAmount = size ? undefined : quoteAmount;
    order.algoOrder = true;
    order.tpslType = params.tpslType;
    order.moveDrawbackRatio = drawbackPercent / 100;
    order.moveActivePrice = activePrice;
    await order.save();

    try {
      await this.logJob(`place order(${clientOrderId}) ...`);

      const result = await exService.placeTpslOrder(apiKey, params);

      ExOrder.setProps(order, result.orderResp);
      order.rawOrderParams = result.rawParams;
      await order.save();

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      if (order.status === OrderStatus.filled) {
        currentDeal.lastOrder = order;
        currentDeal.lastOrderId = order.id;
        await currentDeal.save();
        await this.logJob(`order filled`);
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
}
