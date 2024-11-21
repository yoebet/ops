import { Strategy } from '@/db/models/strategy';
import { AppLogger } from '@/common/app-logger';
import { TradeSide } from '@/data-service/models/base';
import { ExOrder, OrderStatus } from '@/db/models/ex-order';
import { BaseStrategyRunner } from '@/trade-strategy/strategy/base-strategy-runner';
import { StrategyEnv } from '@/trade-strategy/env/strategy-env';
import {
  evalDiffPercent,
  HOUR_MS,
  MINUTE_MS,
  round,
  wait,
} from '@/common/utils/utils';
import { WatchRtPriceParams } from '@/data-ex/ex-public-ws.service';
import { PlaceTpslOrderParams } from '@/exchange/exchange-service-types';
import { ExTradeType } from '@/db/models/exchange-types';

interface StartupParams {
  waitForPercent?: number;
  activePercent?: number;
  drawbackPercent: number;
}

interface RuntimeParams {
  startingPrice?: number;
  placeOrderPrice?: number;

  // basePointPrice?: number;
  activePrice?: number;
  // activePriceReached?: boolean;
  // fillingPrice?: number;
  // fillingPriceReached?: boolean;
}

declare type WatchLevel =
  | 'hibernate' // 2h
  | 'sleep' // 30m
  | 'snap' // 5m
  | 'loose' // 1m
  | 'medium' // 5s
  | 'intense'; // ws

export class SimpleMoveTracing extends BaseStrategyRunner {
  constructor(
    protected strategy: Strategy,
    protected strategyHelper: StrategyEnv,
    protected logger: AppLogger,
  ) {
    super(strategy, strategyHelper, logger);
  }

  async start() {
    while (true) {
      const strategy = this.strategy;
      if (!strategy.active) {
        this.logger.log(`strategy ${strategy.id} is not active`);
        return;
      }

      if (!strategy.params) {
        strategy.params = {
          waitForPercent: 2,
          drawbackPercent: 2,
        } as StartupParams;
      }
      if (!strategy.runtimeParams) {
        strategy.runtimeParams = {};
      }

      await this.loadOrCreateDeal();

      await this.processPendingOrder();

      if (strategy.currentDeal.pendingOrder) {
        await wait(MINUTE_MS);
        continue;
      }

      await this.resetRuntimeParams();

      await strategy.save();

      while (true) {
        try {
          const { placeOrder } = await this.checkAndWaitOpportunity();
          await this.checkCommands();
          if (placeOrder) {
            await this.placeOrder();
            break;
          }

          if (!strategy.active) {
            break;
          }
        } catch (e) {
          this.logger.error(e);
          await wait(MINUTE_MS);
        }
      }
    }
  }

  protected async checkCommands() {
    // reload strategy?
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
        this.resetStartingPrice(lastOrder.execPrice);
      }
    }
    const runtimeParams = strategy.runtimeParams as RuntimeParams;
    if (!runtimeParams.startingPrice) {
      const startingPrice = await this.helper.getLastPrice();
      this.resetStartingPrice(startingPrice);
    }
  }

  protected resetStartingPrice(startingPrice: number) {
    const strategy = this.strategy;
    const runtimeParams: RuntimeParams = (strategy.runtimeParams = {});
    runtimeParams.startingPrice = startingPrice;
    const strategyParams: StartupParams = strategy.params;
    const wfp = strategyParams.waitForPercent;
    if (!wfp) {
      return;
    }
    const ratio =
      strategy.nextTradeSide === TradeSide.buy ? 1 - wfp / 100 : 1 + wfp / 100;
    runtimeParams.placeOrderPrice = runtimeParams.startingPrice * ratio;
  }

  protected async checkAndWaitOpportunity(): Promise<{
    placeOrder?: boolean;
    watchLevel?: WatchLevel;
  }> {
    while (true) {
      const strategy = this.strategy;
      const runtimeParams: RuntimeParams = strategy.runtimeParams;

      const lastPrice = await this.helper.getLastPrice();

      if (!runtimeParams.placeOrderPrice) {
        runtimeParams.placeOrderPrice = lastPrice;
        return { placeOrder: true };
      }

      const placeOrderPrice = runtimeParams.placeOrderPrice;

      if (strategy.nextTradeSide === TradeSide.buy) {
        if (lastPrice <= placeOrderPrice) {
          return { placeOrder: true };
        }
      } else {
        if (lastPrice >= placeOrderPrice) {
          return { placeOrder: true };
        }
      }

      const diffPercent = evalDiffPercent(lastPrice, placeOrderPrice);
      const diffPercentAbs = Math.abs(diffPercent);

      const intenseWatchThreshold = 0.3;
      const intenseWatchExitThreshold = 0.1;

      let watchLevel: WatchLevel;
      if (diffPercentAbs <= intenseWatchThreshold) {
        watchLevel = 'intense';
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
      this.logger.log(`watch level: ${watchLevel}`);

      switch (watchLevel) {
        case 'intense':
          let watchRtPriceParams: WatchRtPriceParams;
          if (strategy.nextTradeSide === TradeSide.buy) {
            watchRtPriceParams = {
              lowerBound: placeOrderPrice,
              upperBound: lastPrice * (1 + intenseWatchExitThreshold / 100),
            };
          } else {
            watchRtPriceParams = {
              lowerBound: lastPrice * (1 - intenseWatchExitThreshold / 100),
              upperBound: placeOrderPrice,
            };
          }
          const result = await this.helper.watchRtPrice({
            ...watchRtPriceParams,
            timeoutSeconds: 10 * 60,
          });
          if (result.timeout) {
            return {};
          }
          if (strategy.nextTradeSide === TradeSide.buy) {
            if (result.reachLower) {
              return { placeOrder: true };
            }
          } else {
            if (result.reachLower) {
              return { placeOrder: true };
            }
          }
          break;
        case 'medium':
          await wait(5 * 1000);
          break;
        case 'loose':
          await wait(MINUTE_MS);
          break;
        case 'snap':
          await wait(5 * MINUTE_MS);
          break;
        case 'sleep':
          await wait(30 * MINUTE_MS);
          break;
        case 'hibernate':
          await wait(2 * HOUR_MS);
          break;
      }

      await this.checkCommands();
    }
  }

  protected async placeOrder() {
    const exSymbol = await this.ensureExchangeSymbol();
    const apiKey = await this.helper.ensureApiKey();

    const unifiedSymbol = exSymbol.unifiedSymbol;
    const strategy = this.strategy;
    const currentDeal = strategy.currentDeal;

    const strategyParams: StartupParams = strategy.params;
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

    const exService = this.helper.getTradeService();

    try {
      const result = await exService.placeTpslOrder(apiKey, params);

      ExOrder.setProps(order, result.orderResp);
      order.rawOrderParams = result.rawParams;

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      if (order.status === OrderStatus.filled) {
        currentDeal.lastOrder = order;
        currentDeal.lastOrderId = order.id;
        await order.save();
        await this.onOrderFilled();
      } else if (ExOrder.orderToWait(order.status)) {
        currentDeal.pendingOrder = order;
        currentDeal.pendingOrderId = order.id;
      } else {
        this.logger.error(`place order failed: ${order.status}`);
      }
    } catch (e) {
      this.logger.error(e);
      order.status = OrderStatus.summitFailed;
      return;
    }
  }
}
