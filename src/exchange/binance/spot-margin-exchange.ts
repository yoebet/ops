import { ExRestParams } from '@/exchange/base/rest/rest.type';
import { BinanceSpotRest } from '@/exchange/binance/rest-spot';
import {
  BaseExchange,
  ExKline,
  ExPrice,
  FetchKlineParams,
  PlaceOrderParams,
  PlaceOrderReturns,
  PlaceTpslOrderParams,
  SyncOrder,
} from '@/exchange/rest-types';
import { BinanceBaseRest } from '@/exchange/binance/rest';
import {
  Candle,
  CreateSpotOrderParams,
  CreateMarginOrderParams,
  SymbolInfo,
  CreateOrderParamsBase,
  OrderResponse,
} from '@/exchange/binance/types';
import { ExApiKey } from '@/exchange/base/api-key';
import { BinanceMarginRest } from '@/exchange/binance/rest-margin';
import { ExAccountCode } from '@/db/models/exchange-types';
import { ExOrderResp, OrderStatus } from '@/db/models/ex-order';

export class BinanceSpotMarginExchange extends BaseExchange {
  restMargin: BinanceMarginRest;
  restSpot: BinanceSpotRest;

  constructor(params?: Partial<ExRestParams>) {
    super({
      exAccount: ExAccountCode.binanceSpot,
      ...params,
    });
    this.restMargin = new BinanceMarginRest(params);
    this.restSpot = new BinanceSpotRest(params);
  }

  static toKline(raw: Candle): ExKline {
    return {
      ts: Number(raw[0]),
      open: Number(raw[1]),
      high: Number(raw[2]),
      low: Number(raw[3]),
      close: Number(raw[4]),
      size: Number(raw[5]),
      amount: Number(raw[7]),
      bs: Number(raw[9]),
      ba: Number(raw[10]),
      ss: Number(raw[5]) - Number(raw[9]),
      sa: Number(raw[7]) - Number(raw[10]),
      tds: Number(raw[8]),
    };
  }

  // https://binance-docs.github.io/apidocs/spot/cn/#k
  async getKlines(params: FetchKlineParams): Promise<ExKline[]> {
    const resultRaw: Candle[] = await this.restSpot.getKlines({
      symbol: params.symbol,
      interval: BinanceBaseRest.toCandleInv(params.interval),
      startTime: params.startTime,
      endTime: params.endTime,
      limit: params.limit,
    });
    if (!resultRaw) {
      return [];
    }

    return resultRaw.map(BinanceSpotMarginExchange.toKline);
  }

  async getSymbolInfo(symbol: string): Promise<SymbolInfo> {
    const res = await this.restSpot.getExchangeInfo({
      symbol,
      // symbols
      showPermissionSets: false,
    });
    return res['symbols'][0];
  }

  async getPrice(symbol: string): Promise<ExPrice> {
    const res: any = await this.restSpot.getPrice(symbol);
    return { last: +res.price };
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
    return exor;
  }

  mapSyncOrderReturns(os: Partial<OrderResponse>[]): SyncOrder[] {
    return os.map((o) => ({
      rawOrder: o,
      orderResp: this.mapOrderResp(o),
    }));
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

    if (params.margin) {
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
    } else {
      const sop = op as CreateSpotOrderParams;
      this.logger.log(sop);
      const result = await this.restSpot.placeSpotOrder(apiKey, sop);
      this.logger.log(result);
      return {
        rawParams: sop,
        rawOrder: result,
        orderResp: {
          exOrderId: '',
          status: OrderStatus.pending,
        },
      };
    }
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
    params: { margin: boolean; symbol: string; orderId: string },
  ): Promise<any> {
    if (params.margin) {
      return this.restMargin.cancelOrder(apiKey, {
        symbol: params.symbol,
        orderId: params.orderId,
      });
    } else {
      return this.restSpot.cancelOrder(apiKey, {
        symbol: params.symbol,
        orderId: params.orderId,
      });
    }
  }

  async cancelBatchOrders(
    apiKey: ExApiKey,
    params: { margin: boolean; symbol: string; orderId: string }[],
  ): Promise<any[]> {
    throw new Error(`not supported`);
  }

  async cancelOrdersBySymbol(
    apiKey: ExApiKey,
    params: { margin: boolean; symbol: string },
  ): Promise<SyncOrder[]> {
    if (params.margin) {
      // isIsolated?: boolean;
      return this.restMargin.cancelOpenOrders(apiKey, {
        symbol: params.symbol,
      });
    } else {
      return this.restSpot.cancelOpenOrders(apiKey, {
        symbol: params.symbol,
      });
    }
  }

  async getAllOpenOrders(
    apiKey: ExApiKey,
    params: { margin: boolean },
  ): Promise<SyncOrder[]> {
    let os;
    if (params.margin) {
      // isIsolated?: boolean;
      os = await this.restMargin.getOpenOrders(apiKey, {});
    } else {
      os = await this.restSpot.getOpenOrders(apiKey);
    }
    return this.mapSyncOrderReturns(os);
  }

  async getOpenOrdersBySymbol(
    apiKey: ExApiKey,
    params: { margin: boolean; symbol: string },
  ): Promise<SyncOrder[]> {
    let os;
    if (params.margin) {
      // isIsolated?: boolean;
      os = this.restMargin.getOpenOrders(apiKey, { symbol: params.symbol });
    } else {
      os = this.restSpot.getOpenOrders(apiKey, params.symbol);
    }
    return this.mapSyncOrderReturns(os);
  }

  async getOrder(
    apiKey: ExApiKey,
    params: { margin: boolean; symbol: string; orderId: string },
  ): Promise<SyncOrder> {
    let o;
    if (params.margin) {
      // isIsolated?: boolean;
      o = await this.restMargin.getOrder(apiKey, {
        symbol: params.symbol,
        orderId: params.orderId,
      });
    } else {
      o = await this.restSpot.getOrder(apiKey, {
        symbol: params.symbol,
        orderId: params.orderId,
      });
    }
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
    let os;
    if (params.margin) {
      os = this.restMargin.getAllOrders(apiKey, {
        symbol: params.symbol,
        // orderId: params.equalAndAfterOrderId,
        startTime: params.startTime,
        endTime: params.endTime,
        limit: params.limit,
      });
    } else {
      os = this.restSpot.getAllOrders(apiKey, {
        symbol: params.symbol,
        // orderId: params.equalAndAfterOrderId,
        startTime: params.startTime,
        endTime: params.endTime,
        limit: params.limit,
      });
      return this.mapSyncOrderReturns(os);
    }
  }
}
