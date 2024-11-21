import * as Rx from 'rxjs';
import {
  AccountAsset,
  AssetItem,
  ExchangeTradeService,
  PlaceOrderParams,
  PlaceOrderReturns,
  PlaceTpslOrderParams,
} from '@/exchange/exchange-service-types';
import { ExApiKey } from '@/exchange/base/rest/rest.type';
import { ExOrder, ExOrderResp, OrderStatus } from '@/db/models/ex-order';
import { Strategy } from '@/db/models/strategy';
import {
  evalDiffPercent,
  HOUR_MS,
  MINUTE_MS,
  wait,
} from '@/common/utils/utils';
import { ExPublicDataService } from '@/data-ex/ex-public-data.service';
import {
  ExPublicWsService,
  WatchRtPriceParams,
} from '@/data-ex/ex-public-ws.service';
import { TradeSide } from '@/data-service/models/base';
import { AppLogger } from '@/common/app-logger';

export class ExTradeServiceMock implements ExchangeTradeService {
  constructor(
    protected readonly strategy: Strategy,
    protected publicDataService: ExPublicDataService,
    protected publicWsService: ExPublicWsService,
    protected logger: AppLogger,
  ) {}

  async waitForPrice(
    targetPrice: number,
    direction: 'up' | 'down',
    cancelCallback?: () => Promise<boolean>,
  ): Promise<number | undefined> {
    const { ex, market, symbol, rawSymbol } = this.strategy;

    while (true) {
      const lastPrice = await this.publicDataService.getLastPrice(
        ex,
        market,
        rawSymbol,
      );
      if (direction === 'up') {
        if (lastPrice >= targetPrice) {
          return lastPrice;
        }
      }
      if (direction === 'down') {
        if (lastPrice <= targetPrice) {
          return lastPrice;
        }
      }

      const diffPercent = evalDiffPercent(lastPrice, targetPrice);
      const diffPercentAbs = Math.abs(diffPercent);

      const intenseWatchThreshold = 0.3;
      const intenseWatchExitThreshold = 0.1;

      if (diffPercentAbs <= intenseWatchThreshold) {
        let watchRtPriceParams: WatchRtPriceParams;
        if (direction === 'down') {
          watchRtPriceParams = {
            lowerBound: targetPrice,
            upperBound: lastPrice * (1 + intenseWatchExitThreshold / 100),
          };
        } else {
          watchRtPriceParams = {
            lowerBound: lastPrice * (1 - intenseWatchExitThreshold / 100),
            upperBound: targetPrice,
          };
        }
        watchRtPriceParams.timeoutSeconds = 10 * 60;
        const watchResult = await this.publicWsService.watchRtPrice(
          ex,
          symbol,
          watchRtPriceParams,
        );
        if (watchResult.timeout) {
          continue;
        }
        if (direction === 'down') {
          if (watchResult.reachLower) {
            return watchResult.price;
          }
        } else {
          if (watchResult.reachLower) {
            return watchResult.price;
          }
        }
      } else if (diffPercentAbs < 1) {
        await wait(10 * 1000);
      } else if (diffPercentAbs < 2) {
        await wait(MINUTE_MS);
      } else if (diffPercentAbs < 5) {
        await wait(5 * MINUTE_MS);
      } else if (diffPercentAbs < 10) {
        await wait(30 * MINUTE_MS);
      } else {
        await wait(2 * HOUR_MS);
      }

      if (await cancelCallback()) {
        return undefined;
      }
    }
  }

  async traceMovingTpsl(
    side: TradeSide,
    drawbackRatio: number,
    activePrice: number | undefined,
    cancelCallback?: () => Promise<boolean>,
  ): Promise<number | undefined> {
    const { ex, market, symbol, rawSymbol } = this.strategy;
    const direction = side === 'buy' ? 'down' : 'up';
    if (activePrice) {
      activePrice = await this.waitForPrice(
        activePrice,
        direction,
        cancelCallback,
      );
    } else {
      activePrice = await this.publicDataService.getLastPrice(
        ex,
        market,
        rawSymbol,
      );
    }
    const { obs, unsubs } = await this.publicWsService.subscribeRtPrice(
      ex,
      symbol,
    );
    const spr = 1 + drawbackRatio;
    const bpr = 1 - drawbackRatio;
    let sentinel = activePrice;
    let placeOrderPrice: number | undefined = undefined;
    const obs1 = obs.pipe(
      Rx.filter((rtPrice) => {
        const price = rtPrice.price;
        if (side === TradeSide.buy) {
          if (price < sentinel) {
            sentinel = price;
            placeOrderPrice = sentinel * spr;
          } else if (price >= placeOrderPrice) {
            return true;
          }
        } else {
          if (price > sentinel) {
            sentinel = price;
            placeOrderPrice = sentinel * bpr;
          } else if (price <= placeOrderPrice) {
            return true;
          }
        }
        return false;
      }),
    );

    await Rx.firstValueFrom(obs1);
    unsubs();

    return placeOrderPrice;
  }

  async traceOrderFilling(params: PlaceOrderParams) {
    const strategy = this.strategy;
    const tradeSide = params.side as TradeSide;
    const cancelCallback = async () => {
      const order = await ExOrder.findOne({
        select: ['id', 'status'],
        where: {
          clientOrderId: params.clientOrderId,
          strategyId: strategy.id,
          paperTrade: true,
        },
      });
      return !ExOrder.orderToWait(order.status);
    };
    if (!params.tpslType) {
      const price = +params.price;
      if (!price) {
        return;
      }
      const hitPrice = await this.waitForPrice(
        price,
        tradeSide === 'buy' ? 'down' : 'up',
        cancelCallback,
      );
      if (hitPrice) {
        const order = await ExOrder.findOneBy({
          clientOrderId: params.clientOrderId,
          strategyId: strategy.id,
          paperTrade: true,
        });
        // fill
        this.fillSize(order, params);
        order.status = OrderStatus.filled;
        await order.save();
      }
      return;
    }
    if (params.algoOrder) {
      let hitPrice: number;
      let trigger: string;
      if (params.tpslType === 'tp') {
        hitPrice = await this.waitTp(params, cancelCallback);
      } else if (params.tpslType === 'sl') {
        hitPrice = await this.waitTp(params, cancelCallback);
      } else if (params.tpslType === 'tpsl') {
        [hitPrice, trigger] = (await Promise.race([
          this.waitTp(params, cancelCallback).then((p) => [p, 'tp']),
          this.waitSl(params, cancelCallback).then((p) => [p, 'sl']),
        ])) as [number, string];
        // TODO:
      } else if (params.tpslType === 'move') {
        const { moveDrawbackRatio, moveActivePrice } =
          params as PlaceTpslOrderParams;
        const activePrice = moveActivePrice ? +moveActivePrice : undefined;
        hitPrice = await this.traceMovingTpsl(
          tradeSide,
          +moveDrawbackRatio,
          activePrice,
        );
      }
      if (hitPrice) {
        const order = await ExOrder.findOneBy({
          clientOrderId: params.clientOrderId,
          strategyId: strategy.id,
          paperTrade: true,
        });
        // fill
        this.fillSize(order, params, hitPrice);
        order.status = OrderStatus.filled;
        await order.save();
      }
      return;
    }
    // attach order TODO:
    // let hitPrice: number;
    // let trigger: string;
    // if (params.tpslType === 'tp') {
    //   hitPrice = await this.waitTp(params, cancelCallback);
    // } else if (params.tpslType === 'sl') {
    //   hitPrice = await this.waitTp(params, cancelCallback);
    // } else if (params.tpslType === 'tpsl') {
    //   [hitPrice, trigger] = (await Promise.race([
    //     this.waitTp(params, cancelCallback).then((p) => [p, 'tp']),
    //     this.waitSl(params, cancelCallback).then((p) => [p, 'sl']),
    //   ])) as [number, string];
    // }
    // tpslClientOrderId
  }

  protected async waitTp(
    params: PlaceOrderParams,
    cancelCallback?: () => Promise<boolean>,
  ): Promise<number | undefined> {
    const direction = params.side === 'buy' ? 'up' : 'down';
    if (params.tpTriggerPrice) {
      await this.waitForPrice(
        +params.tpTriggerPrice,
        direction,
        cancelCallback,
      );
    }
    return this.waitForPrice(+params.tpOrderPrice, direction, cancelCallback);
  }

  protected async waitSl(
    params: PlaceOrderParams,
    cancelCallback?: () => Promise<boolean>,
  ): Promise<number | undefined> {
    const direction = params.side === 'buy' ? 'down' : 'up';
    if (params.slTriggerPrice) {
      await this.waitForPrice(
        +params.slTriggerPrice,
        direction,
        cancelCallback,
      );
    }
    return this.waitForPrice(+params.slOrderPrice, direction, cancelCallback);
  }

  protected fillSize(
    order: ExOrderResp,
    params: PlaceOrderParams,
    price?: number,
  ) {
    price = price || +params.price;
    const execSize = params.baseSize
      ? +params.baseSize
      : +params.quoteAmount / price;
    const execAmount = params.quoteAmount
      ? +params.quoteAmount
      : +params.baseSize * price;
    order.execPrice = price;
    order.execSize = execSize;
    order.execAmount = execAmount;
  }

  async cancelOrder(
    apiKey: ExApiKey,
    params: { symbol: string; orderId: string },
  ): Promise<any> {
    await ExOrder.update(
      { status: OrderStatus.canceled },
      {
        exOrderId: params.orderId,
        strategyId: this.strategy.id,
        paperTrade: true,
      },
    );
    return params;
  }

  getAccountBalance(apiKey: ExApiKey): Promise<AccountAsset> {
    return Promise.resolve(undefined);
  }

  getAccountCoinBalance(
    apiKey: ExApiKey,
    params: { coin: string },
  ): Promise<AssetItem> {
    return Promise.resolve(undefined);
  }

  getAllOpenOrders(
    apiKey: ExApiKey,
    params: { margin: boolean },
  ): Promise<ExOrderResp[]> {
    return Promise.resolve([]);
  }

  async getAllOrders(
    apiKey: ExApiKey,
    params: {
      symbol: string;
      startTime?: number;
      endTime?: number;
      limit?: number;
    },
  ): Promise<ExOrderResp[]> {
    return [];
  }

  async getOrder(
    _apiKey: ExApiKey,
    params: { symbol: string; orderId: string },
  ): Promise<ExOrderResp | undefined> {
    return await ExOrder.findOneBy({
      exOrderId: params.orderId,
      strategyId: this.strategy.id,
      paperTrade: true,
    });
  }

  getPositions(apiKey: ExApiKey): Promise<any[]> {
    return Promise.resolve([]);
  }

  protected newOrderId() {
    return `${this.strategy.ex.toLowerCase()}${Math.round(Date.now() / 1000) - 1e9}`;
  }

  async placeOrder(
    _apiKey: ExApiKey,
    params: PlaceOrderParams,
  ): Promise<PlaceOrderReturns> {
    this.logger.log(JSON.stringify(params, null, 2));
    await wait(500);
    const exOrderId = this.newOrderId();
    if (params.priceType === 'market') {
      const { ex, market, rawSymbol } = this.strategy;
      const price = await this.publicDataService.getLastPrice(
        ex,
        market,
        rawSymbol,
      );
      const orderResp: ExOrderResp = {
        exOrderId,
        status: OrderStatus.filled,
        rawOrder: {},
      };
      this.fillSize(orderResp, params, price);
      return {
        rawParams: {},
        orderResp,
      };
    }

    this.traceOrderFilling(params).catch((e) => this.logger.error(e));

    return {
      rawParams: {},
      orderResp: {
        exOrderId,
        status: OrderStatus.pending,
        rawOrder: {},
      },
    };
  }

  async placeTpslOrder(
    apiKey: ExApiKey,
    params: PlaceTpslOrderParams,
  ): Promise<PlaceOrderReturns> {
    return this.placeOrder(apiKey, params);
  }
}
