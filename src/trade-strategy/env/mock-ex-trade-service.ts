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
import { wait } from '@/common/utils/utils';
import { ExPublicDataService } from '@/data-ex/ex-public-data.service';
import { AppLogger } from '@/common/app-logger';
import { MockOrderTracingService } from '@/trade-strategy/mock-order-tracing.service';

export class MockExTradeService implements ExchangeTradeService {
  constructor(
    protected readonly strategy: Strategy,
    protected publicDataService: ExPublicDataService,
    protected orderTracingService: MockOrderTracingService,
    protected logger: AppLogger,
  ) {}

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
        ex: this.strategy.ex,
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
      ex: this.strategy.ex,
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

    this.orderTracingService
      .addOrderTracingJob(this.strategy.id, params)
      .catch((e) => this.logger.error(e));

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
