import {
  AccountAsset,
  AssetItem,
  ExchangeTradeService,
  PlaceOrderParams,
  PlaceOrderReturns,
  PlaceTpslOrderParams,
} from '@/exchange/exchange-service.types';
import { ExApiKey } from '@/exchange/base/rest/rest.type';
import { ExOrder, ExOrderResp, OrderStatus } from '@/db/models/ex-order';
import { Strategy } from '@/db/models/strategy/strategy';
import { wait } from '@/common/utils/utils';
import { ExPublicDataService } from '@/data-ex/ex-public-data.service';
import { AppLogger } from '@/common/app-logger';
import { MockOrderTracingService } from '@/strategy/mock-order-tracing.service';
import { fillOrderSize, newOrderId } from '@/strategy/strategy.utils';

export class MockExTradeService implements ExchangeTradeService {
  constructor(
    protected readonly strategy: Strategy,
    protected publicDataService: ExPublicDataService,
    protected orderTracingService: MockOrderTracingService,
    protected logger: AppLogger,
  ) {}

  async cancelOrder(
    apiKey: ExApiKey,
    params: { symbol: string; orderId: string },
  ): Promise<any> {
    await ExOrder.update(
      {
        exOrderId: params.orderId,
        strategyId: this.strategy.id,
      },
      { status: OrderStatus.canceled },
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

  async placeOrder(
    _apiKey: ExApiKey,
    params: PlaceOrderParams,
  ): Promise<PlaceOrderReturns> {
    this.logger.log(JSON.stringify(params, null, 2));
    await wait(500);

    const strategy = this.strategy;
    const exOrderId = newOrderId(strategy);
    const order = await ExOrder.findOneBy({
      ex: strategy.ex,
      clientOrderId: params.clientOrderId,
    });

    if (params.priceType === 'market') {
      const { ex, symbol } = strategy;
      const price = await this.publicDataService.getLastPrice(ex, symbol);

      const orderResp: ExOrderResp = {
        exOrderId,
        status: OrderStatus.filled,
        exCreatedAt: new Date(),
        exUpdatedAt: new Date(),
        rawOrder: {},
      };
      fillOrderSize(orderResp, order, price);
      return {
        rawParams: {},
        orderResp,
      };
    }

    this.orderTracingService
      .addOrderTracingJob(order)
      .catch((e) => this.logger.error(e));

    return {
      rawParams: {},
      orderResp: {
        exOrderId,
        status: OrderStatus.pending,
        exCreatedAt: new Date(),
        exUpdatedAt: new Date(),
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
