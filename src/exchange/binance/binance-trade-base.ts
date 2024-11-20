import { ExApiKey, ExRestParams } from '@/exchange/base/rest/rest.type';
import {
  AssetItem,
  ExchangeTradeService,
  PlaceOrderParams,
  PlaceOrderReturns,
  PlaceTpslOrderParams,
  SyncOrder,
  AccountAsset,
} from '@/exchange/exchange-service-types';
import { OrderResponse } from '@/exchange/binance/types';
import { ExOrderResp, OrderStatus } from '@/db/models/ex-order';
import { AppLogger } from '@/common/app-logger';
import { isNaN } from 'lodash';

export abstract class BinanceTradeBase implements ExchangeTradeService {
  protected readonly logger: AppLogger;

  protected constructor(protected params?: Partial<ExRestParams>) {
    this.logger = params.logger || AppLogger.build(this.constructor.name);
  }

  mapOrderResp(exo: Partial<OrderResponse>): ExOrderResp {
    let status: OrderStatus;
    if (!exo.status) {
      status = OrderStatus.pending;
    } else {
      switch (exo.status) {
        case 'NEW':
          status = OrderStatus.pending;
          break;
        case 'PARTIALLY_FILLED':
          status = OrderStatus.partialFilled;
          break;
        case 'FILLED':
          status = OrderStatus.filled;
          break;
        case 'CANCELED':
          status = OrderStatus.canceled;
          break;
        case 'REJECTED':
          status = OrderStatus.rejected;
          break;
        case 'EXPIRED':
        case 'EXPIRED_IN_MATCH':
          status = OrderStatus.expired;
          break;
        default:
          this.logger.error(`unknown order state: ${exo.status}`);
      }
    }
    const exor: ExOrderResp = {
      exOrderId: '' + exo.orderId,
      clientOrderId: exo.clientOrderId,
      status,
    };
    const cqq = +exo.cummulativeQuoteQty;
    const eq = +exo.executedQty;
    if (!isNaN(cqq) && !isNaN(eq)) {
      if (eq !== 0.0) {
        exor.execPrice = cqq / eq;
      }
      exor.execSize = eq;
      exor.execAmount = cqq;
    }
    if (exo.time) {
      exor.exCreatedAt = new Date(+exo.time);
    }
    if (exo.updateTime) {
      exor.exUpdatedAt = new Date(+exo.updateTime);
    }
    exor.rawOrder = exo;
    return exor;
  }

  mapSyncOrderReturns(os: Partial<OrderResponse>[]): SyncOrder[] {
    return os.map((o) => this.mapOrderResp(o));
  }

  abstract cancelBatchOrders(
    apiKey: ExApiKey,
    params: { symbol: string; orderId: string }[],
  ): Promise<any[]>;

  abstract cancelOrder(
    apiKey: ExApiKey,
    params: { symbol: string; orderId: string },
  ): Promise<any>;

  abstract cancelOrdersBySymbol(
    apiKey: ExApiKey,
    params: { symbol: string },
  ): Promise<any>;

  abstract getAllOpenOrders(
    apiKey: ExApiKey,
    params: { margin: boolean },
  ): Promise<SyncOrder[]>;

  abstract getAllOrders(
    apiKey: ExApiKey,
    params: {
      symbol: string;
      startTime?: number;
      endTime?: number;
      limit?: number;
    },
  ): Promise<SyncOrder[]>;

  abstract getOpenOrdersBySymbol(
    apiKey: ExApiKey,
    params: { symbol: string },
  ): Promise<SyncOrder[]>;

  abstract getOrder(
    apiKey: ExApiKey,
    params: { symbol: string; orderId: string },
  ): Promise<SyncOrder | undefined>;

  abstract getAccountBalance(apiKey: ExApiKey): Promise<AccountAsset>;

  abstract getAccountCoinBalance(
    apiKey: ExApiKey,
    params: { coin: string },
  ): Promise<AssetItem>;

  abstract placeOrder(
    apiKey: ExApiKey,
    params: PlaceOrderParams,
  ): Promise<PlaceOrderReturns>;

  abstract placeTpslOrder(
    apiKey: ExApiKey,
    params: PlaceTpslOrderParams,
  ): Promise<PlaceOrderReturns>;

  async getPositions(apiKey: ExApiKey): Promise<any[]> {
    return [];
  }
}
