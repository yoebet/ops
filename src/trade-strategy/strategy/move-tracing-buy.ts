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
  TradeOpportunity,
  MVCheckerParams,
  MVRuntimeParams,
  MVStrategyParams,
} from '@/trade-strategy/strategy.types';
import {
  checkMVOpportunity,
  setPlaceOrderPrice,
} from '@/trade-strategy/opportunity/move';
import { defaultMVCheckerParams } from '@/trade-strategy/strategy.constants';

export class MoveTracingBuy extends BaseRunner {
  protected runtimeParams: {
    open: MVRuntimeParams;
    close: MVRuntimeParams;
  };

  constructor(
    protected strategy: Strategy,
    protected env: StrategyEnv,
    protected jobEnv: StrategyJobEnv,
    protected logger: AppLogger,
  ) {
    super(strategy, env, jobEnv, logger);
  }

  protected setupStrategyParams() {
    const strategy = this.strategy;
    let params: MVStrategyParams = strategy.params;
    if (!params) {
      params = {
        open: defaultMVCheckerParams,
        close: defaultMVCheckerParams,
      };
      strategy.params = params;
    } else if (!params.close) {
      params.close = params.open;
    }
  }

  protected newDealSide(): TradeSide {
    return TradeSide.buy;
  }

  protected async resetRuntimeParams() {
    if (!this.runtimeParams) {
      this.runtimeParams = {
        open: {},
        close: {},
      };
    }

    const strategy = this.strategy;
    const currentDeal = strategy.currentDeal!;
    const lastOrder = currentDeal.lastOrder;

    let startingPrice: number;
    if (lastOrder) {
      strategy.nextTradeSide =
        lastOrder.side === TradeSide.buy ? TradeSide.sell : TradeSide.buy;
    } else {
      strategy.nextTradeSide = this.newDealSide();
    }

    const strategyParams: MVStrategyParams = strategy.params;
    let rps: MVRuntimeParams;
    let cps: MVCheckerParams;
    if (lastOrder) {
      startingPrice = lastOrder.execPrice;
      rps = this.runtimeParams.close;
      cps = strategyParams.close;
    } else {
      startingPrice = await this.env.getLastPrice();
      rps = this.runtimeParams.open;
      cps = strategyParams.open;
    }

    rps.startingPrice = startingPrice;
    await setPlaceOrderPrice.call(
      this,
      rps,
      strategy.nextTradeSide,
      cps.waitForPercent,
    );

    await strategy.save();
  }

  protected async checkAndWaitOpportunity(): Promise<
    TradeOpportunity | undefined
  > {
    const strategy = this.strategy;
    const orderTag = strategy.currentDeal.lastOrder ? 'close' : 'open';
    return checkMVOpportunity.call(
      this,
      this.runtimeParams,
      strategy.nextTradeSide,
      orderTag,
    );
  }

  protected async placeOrder(oppo: TradeOpportunity) {
    const exSymbol = await this.ensureExchangeSymbol();

    const unifiedSymbol = exSymbol.unifiedSymbol;
    const strategy = this.strategy;

    const sps: MVStrategyParams = strategy.params;
    const openOrder = oppo.orderTag === 'open';
    const { activePercent, drawbackPercent } = openOrder ? sps.open : sps.close;
    const placeOrderPrice = oppo.placeOrderPrice;

    if (oppo.side) {
      strategy.nextTradeSide = oppo.side;
    }
    const tradeSide = strategy.nextTradeSide;

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
    order.status = OrderStatus.notSummited;
    order.clientOrderId = clientOrderId;
    order.priceType = params.priceType;
    if (size) {
      order.baseSize = size;
    }
    order.quoteAmount = size ? undefined : quoteAmount;
    order.algoOrder = true;
    order.tpslType = params.tpslType;
    order.moveDrawbackRatio = drawbackPercent / 100;
    if (activePrice) {
      order.moveActivePrice = activePrice;
    }
    await order.save();

    await this.doPlaceOrder(order, params);
  }
}
