import { Strategy } from '@/db/models/strategy';
import { AppLogger } from '@/common/app-logger';
import { TradeSide } from '@/data-service/models/base';
import { OrderStatus } from '@/db/models/ex-order';
import { BaseRunner } from '@/trade-strategy/strategy/base-runner';
import { StrategyEnv, StrategyJobEnv } from '@/trade-strategy/env/strategy-env';
import { round } from '@/common/utils/utils';
import { PlaceTpslOrderParams } from '@/exchange/exchange-service-types';
import { ExTradeType } from '@/db/models/exchange-types';
import {
  CheckOpportunityReturn,
  MVStartupParams,
} from '@/trade-strategy/strategy.types';
import {
  checkMVOpportunity,
  MVRuntimeParams,
} from '@/trade-strategy/opportunity/move';

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
    const runtimeParams = strategy.runtimeParams as MVRuntimeParams;
    if (!runtimeParams.startingPrice) {
      const startingPrice = await this.env.getLastPrice();
      await this.resetStartingPrice(startingPrice);
    }
    await strategy.save();
  }

  protected async resetStartingPrice(startingPrice: number) {
    const strategy = this.strategy;
    const runtimeParams: MVRuntimeParams = (strategy.runtimeParams = {});
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

  protected async checkAndWaitOpportunity(): Promise<CheckOpportunityReturn> {
    return checkMVOpportunity.call(
      this,
      this.strategy.runtimeParams as MVRuntimeParams,
    );
  }

  protected async placeOrder(orderTag?: string) {
    const exSymbol = await this.ensureExchangeSymbol();

    const unifiedSymbol = exSymbol.unifiedSymbol;
    const strategy = this.strategy;

    const strategyParams: MVStartupParams = strategy.params;
    const { activePercent, drawbackPercent } = strategyParams;
    const runtimeParams: MVRuntimeParams = strategy.runtimeParams;

    const tradeSide = strategy.nextTradeSide;

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

    let size = strategy.baseSize;
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
    order.tag = orderTag;
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

    await this.doPlaceOrder(order, params);
  }
}
