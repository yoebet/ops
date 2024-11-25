import { Strategy } from '@/db/models/strategy';
import { AppLogger } from '@/common/app-logger';
import { TradeSide } from '@/data-service/models/base';
import { OrderStatus } from '@/db/models/ex-order';
import { StrategyEnv, StrategyJobEnv } from '@/trade-strategy/env/strategy-env';
import { round } from '@/common/utils/utils';
import { PlaceTpslOrderParams } from '@/exchange/exchange-service-types';
import { ExTradeType } from '@/db/models/exchange-types';
import {
  MVRuntimeParams,
  MVStrategyParams,
  TradeOpportunity,
} from '@/trade-strategy/strategy.types';
import {
  checkMVOpportunity,
  setPlaceOrderPrice,
} from '@/trade-strategy/opportunity/move';
import { defaultMVCheckerParams } from '@/trade-strategy/strategy.constants';
import { RuntimeParamsRunner } from '@/trade-strategy/strategy/runtime-params-runner';

export class MoveTracingBuy extends RuntimeParamsRunner<
  MVRuntimeParams,
  MVRuntimeParams
> {
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

  protected async checkAndWaitOpportunity(): Promise<
    TradeOpportunity | undefined
  > {
    const currentDeal = this.strategy.currentDeal!;
    const lastOrder = currentDeal.lastOrder;

    let side: TradeSide;
    if (lastOrder) {
      side = lastOrder.side === TradeSide.buy ? TradeSide.sell : TradeSide.buy;
    } else {
      side = this.newDealSide();
    }

    let rps: MVRuntimeParams;
    if (lastOrder) {
      rps = this.getCloseRuntimeParams();
      if (rps.startingPrice !== lastOrder.execPrice) {
        rps.startingPrice = lastOrder.execPrice;
        await setPlaceOrderPrice.call(this, rps, side);
      }
    } else {
      rps = this.getOpenRuntimeParams();
      if (!rps.startingPrice) {
        rps.startingPrice = await this.env.getLastPrice();
        await setPlaceOrderPrice.call(this, rps, side);
      }
    }

    const orderTag = lastOrder ? 'close' : 'open';
    return checkMVOpportunity.call(this, rps, side, orderTag);
  }

  protected async placeOrder(oppo: TradeOpportunity) {
    const exSymbol = await this.ensureExchangeSymbol();

    const unifiedSymbol = exSymbol.unifiedSymbol;
    const strategy = this.strategy;

    const sps: MVStrategyParams = strategy.params;
    const openOrder = oppo.orderTag === 'open';
    const { activePercent, drawbackPercent } = openOrder ? sps.open : sps.close;
    const placeOrderPrice = oppo.placeOrderPrice;
    const tradeSide = oppo.side;

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
    order.moveDrawbackRatio = drawbackPercent / 100;
    if (activePrice) {
      order.moveActivePrice = activePrice;
    }
    await order.save();

    await this.doPlaceOrder(order, params);
  }
}
