import { ExAccountCode, ExchangeCode } from '@/db/models/exchange-types';
import { FtKline } from '@/data-service/models/kline';
import { TradeSide } from '@/data-service/models/base';
import { RestTypes } from '@/exchange/okx/types';
import { AppLogger } from '@/common/app-logger';
import { ExApiKey, ExRestParams } from '@/exchange/base/rest/rest.type';
import { ExOrderResp } from '@/db/models/ex-order';

export interface BaseKlineParams {
  exAccount?: ExAccountCode;
  symbol: string;
  interval: string;
}

export interface FetchKlineParams extends BaseKlineParams {
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface ExPrice {
  last?: number;
}

export interface ExTrade {
  ex: ExchangeCode;
  exAccount: ExAccountCode;
  rawSymbol: string; //交易所内的symbol
  tradeId: string;
  price: number;
  size: number; //反向交易对 这里填U金额
  amount?: number;
  side: TradeSide;
  ts: number; // ms
}

export interface PlaceOrderParams {
  symbol: string;
  margin: boolean;
  marginMode?: 'isolated' | 'cross';
  marginCoin?: string; // 保证金币种，仅适用于现货和合约模式下的全仓杠杆订单
  clientOrderId?: string;
  side: 'buy' | 'sell';
  priceType: 'market' | 'limit';
  price?: string; // 委托价格
  baseSize?: string; // 委托数量（base）
  quoteAmount?: string;
  // posSide?: 'long' | 'short';
  timeType?: 'gtc' | 'fok' | 'ioc';
  reduceOnly?: boolean; // 是否只减仓

  algoOrder?: boolean;
  algoType?: 'tp' | 'sl' | 'tpsl' | 'move';
  tpTriggerPrice?: string;
  tpOrderPrice?: string; // 委托价格为-1时，执行市价止盈
  slTriggerPrice?: string;
  slOrderPrice?: string; // 委托价格为-1时，执行市价止损
}

export interface PlaceTpslOrderParams extends PlaceOrderParams {
  moveDrawbackRatio?: string;
  moveActivePrice?: string;
}

export interface PlaceOrderReturns {
  rawParams: any;
  rawOrder: any;
  orderResp: ExOrderResp;
}

export interface SyncOrder {
  rawOrder: any;
  orderResp: ExOrderResp;
}

export type ExKline = FtKline;

export interface ExKlineWithSymbol extends ExKline {
  rawSymbol: string;
  live?: boolean;
}

export abstract class BaseExchange {
  protected readonly logger?: AppLogger;
  protected exAccount: ExAccountCode;

  protected constructor(params?: Partial<ExRestParams>) {
    this.exAccount = params.exAccount;
    this.logger = params.logger || AppLogger.build(`ex:${this.exAccount}`);
  }

  abstract getSymbolInfo(symbol: string): Promise<any>;

  abstract getKlines(params: FetchKlineParams): Promise<ExKline[]>;

  abstract getPrice(symbol: string): Promise<ExPrice>;

  abstract placeOrder(
    apiKey: ExApiKey,
    params: PlaceOrderParams,
  ): Promise<PlaceOrderReturns>;

  abstract placeTpslOrder(
    apiKey: ExApiKey,
    params: PlaceTpslOrderParams,
  ): Promise<PlaceOrderReturns>;

  abstract cancelOrder(
    apiKey: ExApiKey,
    params: {
      margin: boolean;
      symbol: string;
      orderId: string;
    },
  ): Promise<any>;

  abstract cancelOrdersBySymbol(
    apiKey: ExApiKey,
    params: { margin: boolean; symbol: string },
  ): Promise<any>;

  abstract cancelBatchOrders(
    apiKey: ExApiKey,
    params: { margin: boolean; symbol: string; orderId: string }[],
  ): Promise<any[]>;

  abstract getOrder(
    apiKey: ExApiKey,
    params: { margin: boolean; symbol: string; orderId: string },
  ): Promise<SyncOrder>;

  abstract getOpenOrdersBySymbol(
    apiKey: ExApiKey,
    params: {
      margin: boolean;
      symbol: string;
    },
  ): Promise<SyncOrder[]>;

  abstract getAllOpenOrders(
    apiKey: ExApiKey,
    params: { margin: boolean },
  ): Promise<SyncOrder[]>;

  abstract getAllOrders(
    apiKey: ExApiKey,
    params: {
      margin: boolean;
      symbol: string;
      // 如设置 orderId , 订单量将 >= orderId。否则将返回最新订单。
      // equalAndAfterOrderId?: number;
      startTime?: number;
      endTime?: number;
      limit?: number;
    },
  ): Promise<SyncOrder[]>;
}

export declare type ExchangeService = BaseExchange;
