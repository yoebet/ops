import { BaseRunner } from '@/trade-strategy/strategy/base-runner';
import { Strategy } from '@/db/models/strategy';
import { StrategyEnv, StrategyJobEnv } from '@/trade-strategy/env/strategy-env';
import { AppLogger } from '@/common/app-logger';
import { PlaceOrderParams } from '@/exchange/exchange-service-types';
import { round } from '@/common/utils/utils';
import { ExTradeType } from '@/db/models/exchange-types';
import { OrderStatus } from '@/db/models/ex-order';
import {
  BRCheckerParams,
  BRStrategyParams,
  CheckOpportunityReturn,
  MVCheckerParams,
  MVRuntimeParams,
} from '@/trade-strategy/strategy.types';
import { checkBurstOpp } from '@/trade-strategy/opportunity/burst';
import {
  checkMVOpportunity,
  setMVRuntimeParams,
} from '@/trade-strategy/opportunity/move';
import { TradeSide } from '@/data-service/models/base';
import * as _ from 'lodash';

export class BurstMonitor extends BaseRunner {
  protected runtimeParams: {
    close?: MVRuntimeParams;
  };

  constructor(
    protected strategy: Strategy,
    protected env: StrategyEnv,
    protected jobEnv: StrategyJobEnv,
    protected logger: AppLogger,
  ) {
    super(strategy, env, jobEnv, logger);
  }

  setupStrategyParams(): void {
    const open: BRCheckerParams = {
      interval: '1m',
      periods: 30,
      checkPeriods: 2,
      contrastPeriods: 26,
      baselineAmountFlucTimes: 2,
      baselinePriceFlucTimes: 1.5,
      selfAmountFlucTimes: 5,
      selfPriceFlucTimes: 3,
    };
    const close: MVCheckerParams = {
      waitForPercent: 2,
      drawbackPercent: 2,
    };
    const defaultParams: BRStrategyParams = {
      open,
      close,
    };
    const st = this.strategy;
    if (!st.params) {
      st.params = defaultParams;
      return;
    }
    _.mergeWith(st.params, defaultParams);
  }

  protected async resetRuntimeParams() {
    const strategy = this.strategy;
    const currentDeal = strategy.currentDeal!;
    const lastOrder = currentDeal.lastOrder;

    this.runtimeParams = {};
    if (!lastOrder) {
      return;
    }

    strategy.nextTradeSide =
      lastOrder.side === TradeSide.buy ? TradeSide.sell : TradeSide.buy;

    const mvParams: MVRuntimeParams = { startingPrice: lastOrder.execPrice };
    this.runtimeParams.close = mvParams;

    const strategyParams: BRStrategyParams = strategy.params;

    await setMVRuntimeParams.call(
      this,
      mvParams,
      strategyParams.close.waitForPercent,
    );

    await strategy.save();
  }

  protected async checkAndWaitOpportunity(): Promise<CheckOpportunityReturn> {
    const strategy = this.strategy;
    const runtimeParams = this.runtimeParams;
    if (strategy.currentDeal?.lastOrder?.tag === 'open') {
      return checkMVOpportunity.call(this, runtimeParams.close, 'close');
    }
    const strategyParams: BRStrategyParams = strategy.params;
    return checkBurstOpp.call(this, strategyParams.open, 'open');
  }

  protected async placeOrder(orderTag?: string): Promise<void> {
    const exSymbol = await this.ensureExchangeSymbol();

    const unifiedSymbol = exSymbol.unifiedSymbol;
    const strategy = this.strategy;
    const tradeSide = strategy.nextTradeSide;
    const clientOrderId = this.newClientOrderId();

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
    order.tag = orderTag;
    order.status = OrderStatus.notSummited;
    order.clientOrderId = clientOrderId;
    order.priceType = params.priceType;
    order.baseSize = size;
    order.quoteAmount = size ? undefined : quoteAmount;
    order.algoOrder = false;
    await order.save();

    await this.doPlaceOrder(order, params);
  }

  protected async onOrderFilled() {
    const currentDeal = this.strategy.currentDeal;
    const lastOrder = currentDeal.lastOrder;

    if (lastOrder.tag === 'close') {
      await this.closeDeal(currentDeal);
    }
  }
}
