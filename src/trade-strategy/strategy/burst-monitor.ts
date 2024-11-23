import { BaseRunner } from '@/trade-strategy/strategy/base-runner';
import { Strategy } from '@/db/models/strategy';
import { StrategyEnv, StrategyJobEnv } from '@/trade-strategy/env/strategy-env';
import { AppLogger } from '@/common/app-logger';
import { PlaceOrderParams } from '@/exchange/exchange-service-types';
import { round } from '@/common/utils/utils';
import { ExTradeType } from '@/db/models/exchange-types';
import { OrderStatus } from '@/db/models/ex-order';
import { CheckOpportunityReturn } from '@/trade-strategy/strategy.types';
import { checkBurstOpp } from '@/trade-strategy/opportunity/burst';
import {
  checkMVOpportunity,
  MVRuntimeParams,
} from '@/trade-strategy/opportunity/move';

export class BurstMonitor extends BaseRunner {
  constructor(
    protected strategy: Strategy,
    protected env: StrategyEnv,
    protected jobEnv: StrategyJobEnv,
    protected logger: AppLogger,
  ) {
    super(strategy, env, jobEnv, logger);
  }

  protected resetRuntimeParams(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  protected async checkAndWaitOpportunity(): Promise<CheckOpportunityReturn> {
    const runtimeParams = this.strategy.runtimeParams;
    if (this.strategy.currentDeal?.lastOrder?.tag === 'open') {
      return checkMVOpportunity.call(
        this,
        runtimeParams.close as MVRuntimeParams,
        'close',
      );
    }
    return checkBurstOpp.call(this, 'open');
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
