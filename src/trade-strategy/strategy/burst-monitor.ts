import { Strategy } from '@/db/models/strategy';
import { StrategyEnv, StrategyJobEnv } from '@/trade-strategy/env/strategy-env';
import { AppLogger } from '@/common/app-logger';
import { PlaceOrderParams } from '@/exchange/exchange-service-types';
import { round } from '@/common/utils/utils';
import { ExTradeType } from '@/db/models/exchange-types';
import { OrderStatus } from '@/db/models/ex-order';
import {
  BRStrategyParams,
  TradeOpportunity,
  MVRuntimeParams,
  BRCheckerParams,
} from '@/trade-strategy/strategy.types';
import { checkBurstOpp } from '@/trade-strategy/opportunity/burst';
import {
  checkMVOpportunity,
  setPlaceOrderPrice,
} from '@/trade-strategy/opportunity/move';
import { TradeSide } from '@/data-service/models/base';
import * as _ from 'lodash';
import {
  DefaultBRCheckerParams,
  defaultMVCheckerParams,
} from '@/trade-strategy/strategy.constants';
import { RuntimeParamsRunner } from '@/trade-strategy/strategy/runtime-params-runner';

export class BurstMonitor extends RuntimeParamsRunner<
  BRCheckerParams,
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

  setupStrategyParams(): void {
    const defaultParams: BRStrategyParams = {
      open: DefaultBRCheckerParams,
      close: defaultMVCheckerParams,
    };
    const st = this.strategy;
    if (!st.params) {
      st.params = defaultParams;
      return;
    }
    _.mergeWith(st.params, defaultParams);
  }

  protected async checkAndWaitOpportunity(): Promise<TradeOpportunity> {
    const currentDeal = this.strategy.currentDeal!;
    const lastOrder = currentDeal.lastOrder;

    if (lastOrder) {
      const side =
        lastOrder.side === TradeSide.buy ? TradeSide.sell : TradeSide.buy;
      const rps = this.getCloseRuntimeParams();
      if (rps.startingPrice !== lastOrder.execPrice) {
        rps.startingPrice = lastOrder.execPrice;
        await setPlaceOrderPrice.call(this, rps, side);
      }
      return checkMVOpportunity.call(this, rps, side, 'close');
    }

    return checkBurstOpp.call(this, this.getOpenRuntimeParams(), 'open');
  }

  protected async placeOrder(oppo: TradeOpportunity): Promise<void> {
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
    await order.save();

    await this.doPlaceOrder(order, params);
  }
}
