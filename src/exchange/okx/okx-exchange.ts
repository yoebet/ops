import { Injectable } from '@nestjs/common';
import { OkxRest } from '@/exchange/okx/rest';
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
import { ExRestParams } from '@/exchange/base/rest/rest.type';
import {
  CandleRawDataOkx,
  CreateAlgoOrderParams,
  CreateOrderParams,
  OrderAlgoParams,
  RestTypes,
} from '@/exchange/okx/types';
import { ExApiKey } from '@/exchange/base/api-key';
import { ExAccountCode } from '@/db/models/exchange-types';
import { ExOrderResp, OrderStatus } from '@/db/models/ex-order';

@Injectable()
export class OkxExchange extends BaseExchange {
  rest: OkxRest;

  constructor(params?: Partial<ExRestParams>) {
    super({
      exAccount: ExAccountCode.okxUnified,
      ...params,
    });
    this.rest = new OkxRest(params);
  }

  static toCandleInv(inv: string): string {
    // [1s/1m/3m/5m/15m/30m/1H/2H/4H]
    // 香港时间开盘价k线：[6H/12H/1D/2D/3D/1W/1M/3M]
    // UTC时间开盘价k线：[6Hutc/12Hutc/1Dutc/2Dutc/3Dutc/1Wutc/1Mutc/3Mutc]
    const u = inv.charAt(inv.length - 1);
    if (u === 'o') {
      inv = inv.substring(0, inv.length - 1) + 'M';
    }
    if (!['s', 'm'].includes(u)) {
      inv = inv.toUpperCase();
    }
    if (['d', 'w', 'o'].includes(u)) {
      return inv + 'utc';
    }
    return inv;
  }

  static toKline(raw: CandleRawDataOkx): ExKline {
    return {
      ts: Number(raw[0]),
      open: Number(raw[1]),
      high: Number(raw[2]),
      low: Number(raw[3]),
      close: Number(raw[4]),
      size: Number(raw[6]),
      amount: Number(raw[7]),
      // bs: 0,
      // ba: 0,
      // ss: 0,
      // sa: 0,
      // tds: 0,
    };
  }

  // 获取交易产品K线数据 https://www.okx.com/docs-v5/zh/#order-book-trading-market-data-get-candlesticks
  async getKlines(params: FetchKlineParams): Promise<ExKline[]> {
    const candles: CandleRawDataOkx[] = await this.rest.getCandles({
      instId: params.symbol,
      bar: OkxExchange.toCandleInv(params.interval),
      before: params.startTime,
      after: params.endTime,
      limit: params.limit,
    });
    if (!candles) {
      return [];
    }
    return candles.map(OkxExchange.toKline);
  }

  async getSymbolInfo(symbol: string): Promise<any> {
    const res = await this.rest.getMarkets({
      instType: 'SPOT',
      instId: symbol,
    });
    return res[0];
  }

  async getPrice(symbol: string): Promise<ExPrice> {
    const tickers = await this.rest.getTicker({ instId: symbol });
    const t = tickers[0];
    return { last: +t.last };
  }

  mapOrderResp(exo: RestTypes['Order']): ExOrderResp {
    let status: OrderStatus;
    if (!exo.state) {
      status = OrderStatus.pending;
    } else {
      switch (exo.state) {
        case 'canceled':
        case 'mmp_canceled':
          status = OrderStatus.canceled;
          break;
        case 'live':
          status = OrderStatus.pending;
          break;
        case 'partially_filled':
          status = OrderStatus.partialFilled;
          break;
        case 'filled':
          status = OrderStatus.filled;
          break;
        default:
          this.logger.error(`unknown order state: ${exo.state}`);
      }
    }
    const exor: ExOrderResp = {
      exOrderId: exo.ordId,
      status,
    };
    if (exo.avgPx != null) {
      exor.execPrice = +exo.avgPx;
    }
    if (exo.accFillSz != null) {
      exor.execSize = +exo.accFillSz;
    }
    if (exor.execPrice && exor.execSize) {
      exor.execAmount = exor.execSize * exor.execPrice;
    }
    if (exo.cTime) {
      exor.exCreatedAt = new Date(+exo.cTime);
    }
    if (exo.uTime) {
      exor.exUpdatedAt = new Date(+exo.uTime);
    }
    return exor;
  }

  async placeTpslOrder(
    apiKey: ExApiKey,
    params: PlaceTpslOrderParams,
  ): Promise<PlaceOrderReturns> {
    const op: CreateAlgoOrderParams = {
      instId: params.symbol,
      side: params.side,
      sz: params.baseSize,
      tdMode: params.margin ? params.marginMode : 'cash',
      // posSide: params.posSide,
      ccy: params.marginMode === 'cross' ? params.marginCoin : undefined,
      reduceOnly: params.reduceOnly,
      ordType: 'conditional',
    };

    if (
      params.algoType === 'tp' ||
      params.algoType === 'sl' ||
      params.algoType === 'tpsl'
    ) {
      const biDirection = params.algoType === 'tpsl';
      if (biDirection) {
        op.ordType = 'oco';
      }
      if (params.algoType === 'tp' || params.algoType === 'tpsl') {
        op.tpTriggerPx = params.tpTriggerPrice;
        op.tpOrdPx = params.tpOrderPrice;
        // tpOrdKind
      }
      if (params.algoType === 'sl' || params.algoType === 'tpsl') {
        op.slTriggerPx = params.slTriggerPrice;
        op.slOrdPx = params.slOrderPrice;
      }
    } else if (params.algoType === 'move') {
      op.ordType = 'move_order_stop';
      op.callbackRatio = params.moveDrawbackRatio;
      op.activePx = params.moveActivePrice;
    } else {
      throw new Error('unsupported ordType');
    }

    this.logger.log(op);
    const result = await this.rest.createAlgoOrder(apiKey, op);
    this.logger.log(result);
    return {
      rawParams: op,
      rawOrder: result,
      orderResp: this.mapOrderResp(result as any),
    };
  }

  async placeOrder(
    apiKey: ExApiKey,
    params: PlaceOrderParams,
  ): Promise<PlaceOrderReturns> {
    if (params.margin && !params.marginMode) {
      throw new Error(`missing marginMode`);
    }

    if (!params.baseSize && !params.quoteAmount) {
      throw new Error(`missing size`);
    }
    let type: RestTypes['Order']['ordType'] = params.priceType;
    if (params.timeType) {
      if (params.timeType === 'gtc') {
        type = 'post_only';
      } else if (params.timeType === 'fok' || params.timeType === 'ioc') {
        type = params.timeType;
      }
    }
    const op: CreateOrderParams = {
      clOrdId: params.clientOrderId,
      instId: params.symbol,
      ordType: type,
      px: params.price,
      side: params.side,
      sz: params.baseSize,
      tdMode: params.margin ? params.marginMode : 'cash',
      // posSide: params.posSide,
      ccy: params.marginMode === 'cross' ? params.marginCoin : undefined,
      // reduceOnly: false,
    };
    if (!params.margin && type === 'market') {
      if (params.quoteAmount) {
        op.sz = params.quoteAmount;
        op.tgtCcy = 'quote_ccy';
      } else {
        op.tgtCcy = 'base_ccy';
      }
    }
    if (!op.sz) {
      throw new Error(`missing size`);
    }

    if (params.algoType) {
      const alp: OrderAlgoParams = {};
      if (params.algoType === 'tp' || params.algoType === 'tpsl') {
        alp.tpTriggerPx = params.tpTriggerPrice;
        alp.tpOrdPx = params.tpOrderPrice;
      }
      if (params.algoType === 'sl' || params.algoType === 'tpsl') {
        alp.slTriggerPx = params.slTriggerPrice;
        alp.slOrdPx = params.slOrderPrice;
      }
      op.attachAlgoOrds = [alp];
    }

    this.logger.log(op);

    const result = await this.rest.createOrder(apiKey, op);
    this.logger.log(result);
    return {
      rawParams: op,
      rawOrder: result,
      orderResp: this.mapOrderResp(result as any),
    };
  }

  async cancelOrder(
    apiKey: ExApiKey,
    params: { margin: boolean; symbol: string; orderId: string },
  ): Promise<any> {
    return this.rest.cancelOrder(apiKey, {
      instId: params.symbol,
      ordId: params.orderId,
    });
  }

  async cancelBatchOrders(
    apiKey: ExApiKey,
    params: { margin: boolean; symbol: string; orderId: string }[],
  ): Promise<any[]> {
    return this.rest.cancelBatchOrders(
      apiKey,
      params.map((s) => ({ instId: s.symbol, ordId: s.orderId })),
    );
  }

  async cancelOrdersBySymbol(
    _apiKey: ExApiKey,
    _params: { margin: boolean; symbol: string },
  ): Promise<any> {
    // return this.rest.cancelBatchOrders()
    throw new Error(`not supported`);
  }

  async getAllOpenOrders(
    apiKey: ExApiKey,
    _params: { margin: boolean },
  ): Promise<SyncOrder[]> {
    const ros = await this.rest.getOpenOrders(apiKey, {});
    return ros.map((o) => ({
      rawOrder: o,
      orderResp: this.mapOrderResp(o),
    }));
  }

  async getOpenOrdersBySymbol(
    apiKey: ExApiKey,
    params: { margin: boolean; symbol: string },
  ): Promise<SyncOrder[]> {
    const ros = await this.rest.getOpenOrders(apiKey, {
      instId: params.symbol,
    });
    return ros.map((o) => ({
      rawOrder: o,
      orderResp: this.mapOrderResp(o),
    }));
  }

  async getOrder(
    apiKey: ExApiKey,
    params: { margin: boolean; symbol: string; orderId: string },
  ): Promise<SyncOrder> {
    const ro = await this.rest.getOrder(apiKey, {
      instId: params.symbol,
      ordId: params.orderId,
    });
    return {
      rawOrder: ro,
      orderResp: this.mapOrderResp(ro as any),
    };
  }

  async getAllOrders(
    apiKey: ExApiKey,
    params: {
      margin: boolean;
      symbol: string;
      // isIsolated?: boolean;
      // 如设置 orderId , 订单量将 >= orderId。否则将返回最新订单。
      // equalAndAfterOrderId?: number;
      startTime?: number;
      endTime?: number;
      limit?: number;
    },
  ): Promise<SyncOrder[]> {
    const ros = await this.rest.getClosedOrders(apiKey, {
      instType: params.margin ? 'MARGIN' : 'SPOT',
      instId: params.symbol,
      // before: params.equalAndAfterOrderId,
      begin: params.startTime,
      end: params.endTime,
      limit: params.limit,
    });
    return ros.map((o) => ({
      rawOrder: o,
      orderResp: this.mapOrderResp(o),
    }));
  }
}
