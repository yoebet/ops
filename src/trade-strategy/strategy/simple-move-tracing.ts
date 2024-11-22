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
import { MVStartupParams } from '@/trade-strategy/strategy.types';

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
    protected env: StrategyEnv,
    protected logger: AppLogger,
  ) {
    super(strategy, env, logger);
  }

  async run() {
    const strategy = this.strategy;

    await this.logJob(`run strategy #${strategy.id} ...`);
    await this.reportJobStatus('top', `run strategy #${strategy.id} ...`);

    if (!strategy.active) {
      await this.logJob(`strategy ${strategy.id} is not active`);
      return;
    }

    if (!strategy.params) {
      strategy.params = {
        waitForPercent: 2,
        drawbackPercent: 2,
      } as MVStartupParams;
    }
    strategy.runtimeParams = {};

    while (true) {
      try {
        if (!strategy.active) {
          this.logger.log(`strategy ${strategy.id} is not active, exit ...`);
          break;
        }

        await this.checkCommands();

        await this.loadOrCreateDeal();

        await this.repeatToComplete(this.checkAndWaitPendingOrder.bind(this), {
          context: 'checkAndWaitPendingOrder',
        });

        await this.resetRuntimeParams();

        const opp = await this.repeatToComplete(
          this.checkAndWaitOpportunity.bind(this),
          { context: 'checkAndWaitOpportunity' },
        );
        if (opp.placeOrder) {
          await this.placeOrder();
        }
      } catch (e) {
        this.logger.error(e);
        await this.logJob(e.message);
        await wait(MINUTE_MS);
      }
    }
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
    watchLevel?: WatchLevel;
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
      await this.logJob(
        `watch level: ${watchLevel}, ${lastPrice}(last) -> ${placeOrderPrice}(place-order), ${diffPercent}%`,
      );

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
          const result = await this.env.watchRtPrice({
            ...watchRtPriceParams,
            timeoutSeconds: 10 * 60,
          });

          if (result.timeout) {
            await this.logJob(`timeout, ${result.price}(last)`);
            return {};
          }
          if (strategy.nextTradeSide === TradeSide.buy) {
            if (result.reachLower) {
              await this.logJob(`reachLower, ${result.price}(last)`);
              return { placeOrder: true };
            }
          } else {
            if (result.reachUpper) {
              await this.logJob(`reachUpper, ${result.price}(last)`);
              return { placeOrder: true };
            }
          }
          break;
        case 'medium':
          await this.logJob(`wait 5s`);
          await wait(5 * 1000);
          break;
        case 'loose':
          await this.logJob(`wait 1m`);
          await wait(MINUTE_MS);
          break;
        case 'snap':
          await this.logJob(`wait 5m`);
          await wait(5 * MINUTE_MS);
          break;
        case 'sleep':
          await this.logJob(`wait 30m`);
          await wait(30 * MINUTE_MS);
          break;
        case 'hibernate':
          await this.logJob(`wait 2h`);
          await wait(2 * HOUR_MS);
          break;
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
