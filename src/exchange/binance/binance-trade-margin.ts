import { ExApiKey, ExRestParams } from '@/exchange/base/rest/rest.type';
import {
  AssetItem,
  PlaceOrderParams,
  PlaceOrderReturns,
  PlaceTpslOrderParams,
  SyncOrder,
  AccountAsset,
} from '@/exchange/exchange-service-types';
import {
  CreateMarginOrderParams,
  CreateOrderParamsBase,
} from '@/exchange/binance/types';
import { BinanceMarginRest } from '@/exchange/binance/rest-margin';
import { OrderStatus } from '@/db/models/ex-order';
import { BinanceTradeBase } from '@/exchange/binance/binance-trade-base';

export class BinanceTradeMargin extends BinanceTradeBase {
  restMargin: BinanceMarginRest;

  constructor(params?: Partial<ExRestParams>) {
    super(params);
    this.restMargin = new BinanceMarginRest(params);
  }

  // 现货/杠杆账户下单
  async placeOrder(
    apiKey: ExApiKey,
    params: PlaceOrderParams,
  ): Promise<PlaceOrderReturns> {
    const op: CreateOrderParamsBase = {
      symbol: params.symbol,
      newClientOrderId: params.clientOrderId,
      newOrderRespType: 'FULL',
      // price: params.price,
      // quantity: params.size,
      // quoteOrderQty: params.quoteAmount,
      side: params.side.toUpperCase() as any,
      // sideEffectType: undefined,
      // stopPrice: '',
      // icebergQty: '',
      // timeInForce: params.timeType?.toUpperCase() as any,
      type: params.priceType.toUpperCase() as any,
    };
    if (params.quoteAmount) {
      op.quoteOrderQty = params.quoteAmount;
    } else {
      op.quantity = params.baseSize;
    }
    if (op.type.includes('LIMIT')) {
      op.price = params.price;
      if (!op.timeInForce) {
        op.timeInForce = 'GTC';
      }
    }
    // TODO: params.tp, params.sl

    const mop = op as CreateMarginOrderParams;
    mop.isIsolated = params.marginMode === 'isolated';
    this.logger.log(mop);
    const result = await this.restMargin.placeMarginOrder(apiKey, mop);
    this.logger.log(result);
    return {
      rawParams: mop,
      rawOrder: result,
      orderResp: {
        exOrderId: '',
        status: OrderStatus.pending,
      },
    };
  }

  placeTpslOrder(
    apiKey: ExApiKey,
    params: PlaceTpslOrderParams,
  ): Promise<PlaceOrderReturns> {
    // TODO:
    return Promise.resolve(undefined);
  }

  async cancelOrder(
    apiKey: ExApiKey,
    params: { symbol: string; orderId: string },
  ): Promise<any> {
    return this.restMargin.cancelOrder(apiKey, {
      symbol: params.symbol,
      orderId: params.orderId,
    });
  }

  async cancelBatchOrders(
    apiKey: ExApiKey,
    params: { symbol: string; orderId: string }[],
  ): Promise<any[]> {
    throw new Error(`not supported`);
  }

  async cancelOrdersBySymbol(
    apiKey: ExApiKey,
    params: { symbol: string },
  ): Promise<SyncOrder[]> {
    // isIsolated?: boolean;
    return this.restMargin.cancelOpenOrders(apiKey, {
      symbol: params.symbol,
    });
  }

  async getAllOpenOrders(
    apiKey: ExApiKey,
    params: { margin: boolean },
  ): Promise<SyncOrder[]> {
    // isIsolated?: boolean;
    const os = await this.restMargin.getOpenOrders(apiKey, {});
    return this.mapSyncOrderReturns(os);
  }

  async getOpenOrdersBySymbol(
    apiKey: ExApiKey,
    params: { symbol: string },
  ): Promise<SyncOrder[]> {
    // isIsolated?: boolean;
    const os = await this.restMargin.getOpenOrders(apiKey, {
      symbol: params.symbol,
    });
    return this.mapSyncOrderReturns(os);
  }

  async getOrder(
    apiKey: ExApiKey,
    params: { symbol: string; orderId: string },
  ): Promise<SyncOrder> {
    const o = await this.restMargin.getOrder(apiKey, {
      symbol: params.symbol,
      orderId: params.orderId,
    });
    return {
      rawOrder: o,
      orderResp: this.mapOrderResp(o),
    };
  }

  async getAllOrders(
    apiKey: ExApiKey,
    params: {
      margin: boolean;
      // 如果 isIsolated 为 true, symbol 为必填
      symbol: string;
      // isIsolated?: boolean;
      // 如设置 orderId , 订单量将 >= orderId。否则将返回最新订单。
      // equalAndAfterOrderId?: number;
      startTime?: number;
      endTime?: number;
      limit?: number;
    },
  ): Promise<SyncOrder[]> {
    const os = await this.restMargin.getAllOrders(apiKey, {
      symbol: params.symbol,
      // orderId: params.equalAndAfterOrderId,
      startTime: params.startTime,
      endTime: params.endTime,
      limit: params.limit,
    });
    return this.mapSyncOrderReturns(os);
  }

  async getAccountBalance(apiKey: ExApiKey): Promise<AccountAsset> {
    const bals = await this.restMargin.getMarginAccount(apiKey);
    return {
      timestamp: Date.now(),
      // totalEqUsd: undefined,
      coinAssets: bals.userAssets
        .map((a) => ({
          coin: a.asset,
          eq: +a.netAsset,
          availBal: +a.free,
          frozenBal: +a.locked,
        }))
        .filter((a) => a.eq !== 0 || a.availBal !== 0 || a.frozenBal !== 0),
    };
  }

  async getAccountCoinBalance(
    apiKey: ExApiKey,
    params: { coin: string },
  ): Promise<AssetItem> {
    const bals = await this.getAccountBalance(apiKey);
    return bals.coinAssets.filter((a) => a.coin === params.coin)[0];
  }
}
