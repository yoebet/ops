import { Injectable } from '@nestjs/common';
import { OkxRest } from '@/exchange/okx/rest';
import {
  BaseExchange,
  ExKline,
  ExPrice,
  FetchKlineParams,
  PlaceOrderParams,
  PlaceTpslOrderParams,
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

  async placeTpslOrder(
    apiKey: ExApiKey,
    params: PlaceTpslOrderParams,
  ): Promise<any> {
    const { tp, sl, mtpsl } = params;

    const op: CreateAlgoOrderParams = {
      instId: params.symbol,
      side: params.side,
      sz: params.size,
      tdMode: params.margin ? params.marginMode : 'cash',
      posSide: params.posSide,
      ccy: params.marginMode === 'cross' ? params.ccy : undefined,
      reduceOnly: params.reduceOnly,
      ordType: 'conditional',
    };

    if (tp || sl) {
      const biDirection = tp && sl;
      if (biDirection) {
        op.ordType = 'oco';
      }
      if (tp) {
        if (tp.triggerPrice) {
          op.tpTriggerPx = tp.triggerPrice;
        }
        op.tpOrdPx = tp.orderPrice;
      }
      if (sl) {
        if (sl.triggerPrice) {
          op.slTriggerPx = sl.triggerPrice;
        }
        op.slOrdPx = sl.orderPrice;
      }
    } else if (mtpsl) {
      op.ordType = 'move_order_stop';
      if (mtpsl.drawbackRatio) {
        op.callbackRatio = mtpsl.drawbackRatio;
      }
      if (mtpsl.drawbackSpread) {
        op.callbackSpread = mtpsl.drawbackSpread;
      }
      if (mtpsl.activePrice) {
        op.activePx = mtpsl.activePrice;
      }
    } else {
      throw new Error('unsupported ordType');
    }

    this.logger.log(op);
    const result = await this.rest.createAlgoOrder(apiKey, op);
    this.logger.log(result);
    return result;
  }

  async placeOrder(apiKey: ExApiKey, params: PlaceOrderParams): Promise<any> {
    if (params.margin && !params.marginMode) {
      throw new Error(`missing marginMode`);
    }

    if (!params.size && !params.quoteAmount) {
      throw new Error(`missing size`);
    }
    let type: RestTypes['Order']['ordType'] = params.type;
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
      sz: params.size,
      tdMode: params.margin ? params.marginMode : 'cash',
      posSide: params.posSide,
      ccy: params.marginMode === 'cross' ? params.ccy : undefined,
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

    const { tp, sl } = params;
    const alp: OrderAlgoParams = {};
    if (tp) {
      if (tp.triggerPrice) {
        alp.tpTriggerPx = tp.triggerPrice;
      }
      alp.tpOrdPx = tp.orderPrice;
    }
    if (sl) {
      if (sl.triggerPrice) {
        alp.slTriggerPx = sl.triggerPrice;
      }
      alp.slOrdPx = sl.orderPrice;
    }
    op.attachAlgoOrds = [alp];

    this.logger.log(op);

    const result = await this.rest.createOrder(apiKey, op);
    this.logger.log(result);
    return result;
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
  ): Promise<any> {
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
  ): Promise<any[]> {
    return this.rest.getOpenOrders(apiKey, {});
  }

  async getOpenOrdersBySymbol(
    apiKey: ExApiKey,
    params: { margin: boolean; symbol: string },
  ): Promise<any[]> {
    return this.rest.getOpenOrders(apiKey, { instId: params.symbol });
  }

  async getOrder(
    apiKey: ExApiKey,
    params: { margin: boolean; symbol: string; orderId: string },
  ): Promise<any> {
    return this.rest.getOrder(apiKey, {
      instId: params.symbol,
      ordId: params.orderId,
    });
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
  ): Promise<any> {
    return this.rest.getClosedOrders(apiKey, {
      instType: params.margin ? 'MARGIN' : 'SPOT',
      instId: params.symbol,
      // before: params.equalAndAfterOrderId,
      begin: params.startTime,
      end: params.endTime,
      limit: params.limit,
    });
  }
}
