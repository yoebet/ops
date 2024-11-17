import {
  ExchangeCode,
  ExMarket,
  ExTradeType,
} from '@/db/models/exchange-types';
import { FtKline } from '@/data-service/models/kline';
import { TradeSide } from '@/data-service/models/base';
import { ExApiKey } from '@/exchange/base/rest/rest.type';
import { ExOrderResp } from '@/db/models/ex-order';
import { ChannelConnectionEvent } from '@/exchange/base/ws/ex-ws';
import {
  NoParamSubject,
  SymbolParamSubject,
} from '@/exchange/base/ws/ex-ws-subjects';
import * as Rx from 'rxjs';

export interface FetchKlineParams {
  symbol: string;
  interval: string;
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface ExPrice {
  last: number;
  ts: number;
}

export interface ExTrade {
  ex: ExchangeCode;
  market: ExMarket;
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

export interface AssetItem {
  coin: string;
  eq: number;
  eqUsd?: number;
  frozenBal: number;
  ordFrozen?: number; // 其中挂单冻结
  availBal: number;
}

export interface AccountAsset {
  totalEqUsd?: number;
  coinAssets: AssetItem[];
  timestamp: number;
}

export type ExKline = FtKline;

export interface ExWsKline extends ExKline {
  ex: ExchangeCode;
  market: ExMarket;
  rawSymbol: string;
  live?: boolean;
}

export interface ExchangeMarketDataService {
  getSymbolInfo(symbol: string): Promise<any>;

  getKlines(params: FetchKlineParams): Promise<ExKline[]>;

  getPrice(symbol: string): Promise<ExPrice>;
}

export interface ExchangeTradeService {
  placeOrder(
    apiKey: ExApiKey,
    params: PlaceOrderParams,
  ): Promise<PlaceOrderReturns>;

  placeTpslOrder(
    apiKey: ExApiKey,
    params: PlaceTpslOrderParams,
  ): Promise<PlaceOrderReturns>;

  cancelOrder(
    apiKey: ExApiKey,
    params: {
      symbol: string;
      orderId: string;
    },
  ): Promise<any>;

  cancelOrdersBySymbol(
    apiKey: ExApiKey,
    params: { symbol: string },
  ): Promise<any>;

  cancelBatchOrders(
    apiKey: ExApiKey,
    params: { symbol: string; orderId: string }[],
  ): Promise<any[]>;

  getOrder(
    apiKey: ExApiKey,
    params: { symbol: string; orderId: string },
  ): Promise<SyncOrder>;

  getOpenOrdersBySymbol(
    apiKey: ExApiKey,
    params: {
      symbol: string;
    },
  ): Promise<SyncOrder[]>;

  getAllOpenOrders(
    apiKey: ExApiKey,
    params: { margin: boolean },
  ): Promise<SyncOrder[]>;

  getAllOrders(
    apiKey: ExApiKey,
    params: {
      symbol: string;
      // 如设置 orderId , 订单量将 >= orderId。否则将返回最新订单。
      // equalAndAfterOrderId?: number;
      startTime?: number;
      endTime?: number;
      limit?: number;
    },
  ): Promise<SyncOrder[]>;

  getAccountBalance(apiKey: ExApiKey): Promise<AccountAsset>;

  getAccountCoinBalance(
    apiKey: ExApiKey,
    params: {
      coin: string;
    },
  ): Promise<AssetItem>;

  getPositions(apiKey: ExApiKey): Promise<any[]>;
}

export type TradeChannelEvent = ChannelConnectionEvent<ExTrade>;

export interface ExchangeMarketDataWs {
  tradeSubject(): SymbolParamSubject<ExTrade>;

  klineSubject(interval: string): SymbolParamSubject<ExWsKline>;

  tradeConnectionEvent(): Rx.Observable<TradeChannelEvent>;

  shutdown(): void;
}

export interface ExchangePrivateDataWs {
  orderSubject(): NoParamSubject<SyncOrder>;

  shutdown(): void;
}

export interface ExchangeFacade {
  getExTradeService(tradeType: ExTradeType): ExchangeTradeService;

  getExMarketDataService(market: ExMarket): ExchangeMarketDataService;

  getExMarketDataWs(market: ExMarket): ExchangeMarketDataWs;

  getExPrivateDataWs(
    apiKey: ExApiKey,
    tradeType: ExTradeType,
  ): ExchangePrivateDataWs;

  shutdown(): void;
}
