import { ExAccountCode, ExchangeCode } from '@/db/models/exchange-types';
import { FtKline } from '@/data-service/models/kline';
import { TradeSide } from '@/data-service/models/base';
import { RestTypes } from '@/exchange/okx/types';
import { ExApiKey } from '@/exchange/base/api-key';
import { AppLogger } from '@/common/app-logger';
import { ExRestParams } from '@/exchange/base/rest/rest.type';

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
  settleCoin?: string;
  margin: boolean;
  marginMode?: 'isolated' | 'cross';
  ccy?: string; // 保证金币种，仅适用于现货和合约模式下的全仓杠杆订单
  clientOrderId?: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  timeType?: 'gtc' | 'fok' | 'ioc';
  size?: string; // 委托数量（base）
  quoteAmount?: string;
  price?: string; // 委托价格
  posSide?: 'long' | 'short';
  reduceOnly?: boolean; // 是否只减仓

  tp?: {
    triggerPrice?: string;
    orderPrice?: string;
  };
  sl?: {
    triggerPrice?: string;
    orderPrice?: string;
  };
}

export interface PlaceTpslOrderParams extends PlaceOrderParams {
  mtpsl?: {
    drawbackSpread?: string;
    drawbackRatio?: string;
    activePrice?: string;
  };
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

  abstract placeOrder(apiKey: ExApiKey, params: PlaceOrderParams): Promise<any>;

  abstract placeTpslOrder(
    apiKey: ExApiKey,
    params: PlaceTpslOrderParams,
  ): Promise<any>;

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
  ): Promise<any>;

  abstract getOrder(
    apiKey: ExApiKey,
    params: { margin: boolean; symbol: string; orderId: string },
  ): Promise<any>;

  abstract getOpenOrdersBySymbol(
    apiKey: ExApiKey,
    params: {
      margin: boolean;
      symbol: string;
    },
  ): Promise<any[]>;

  abstract getAllOpenOrders(
    apiKey: ExApiKey,
    params: { margin: boolean },
  ): Promise<any[]>;

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
  ): Promise<any>;
}

export declare type ExchangeService = BaseExchange;
