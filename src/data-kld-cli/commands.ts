export enum OflowCommand {
  meta = 'meta',
  data = 'data',
  subs = 'subs',
  live = 'live',
}

export enum OflowDataType {
  kline = 'kline',
  ticker = 'ticker',
}

export enum OflowDataChannel {
  kline = 'kline',
  ticker = 'ticker',
}

// request ...

export interface OflowRequest {
  reqId?: string;
}

export interface MetaDataRequest extends OflowRequest {
  type:
    | 'coins'
    | 'exchanges'
    | 'exAccounts'
    | 'symbols'
    | 'exSymbols'
    | 'intervals'
    | 'time';
  params?: any;
}

export type ExSymbolCodes = { ex: string; symbols: string[] };

export interface ExSymbolScope {
  ex: string;
  symbol: string;

  baseCoin?: string;
  // 多symbol聚合请求，如有则忽略ex/symbol。不会为空数组[]
  exSymbols?: ExSymbolCodes[];
}

export interface TickerDataScope extends ExSymbolScope {
  // 仅ticker。对齐到10
  throttle?: number;
  // ticker query
  slices?: SliceCondition[];
}

export interface KlineDataScope extends ExSymbolScope {
  interval: string;
}

export type SliceCondition = {
  field: string;
  range: [undefined | number, undefined | number];
};

export type DataScope = KlineDataScope | TickerDataScope;

export interface TimeRange {
  timeFrom: number;
  timeTo?: number;
  limit?: number;
}

export interface KlineQueryParams extends KlineDataScope, TimeRange {}

export type DataRequestParams = KlineQueryParams;

export interface AggField {
  // field是前端接口的数据字段，可能要映射成数据库字段
  field: string;
  // 返回数据的key，未设置用field
  name?: string;
  // count/sum/min/max/avg/earliest/latest/...
  method?: string;
}

export interface AggregateParams {
  aggFields: AggField[];
  groupFields?: string[];
}

export interface KlineAggregateParams
  extends KlineQueryParams,
    AggregateParams {}

export type AggregateRequestParams = KlineAggregateParams;

export type CompactAggRequestParams = Omit<
  AggregateRequestParams,
  'aggFields'
> & {
  aggFields: (AggField | Omit<AggField, 'method'> | string)[];
};

export interface KlineDataRequest extends OflowRequest {
  type: OflowDataType.kline;
  params: KlineQueryParams | KlineAggregateParams;
}

export type DataRequest = KlineDataRequest;

export interface LiveKlineRequest extends OflowRequest {
  type: OflowDataType.kline;
  params: KlineDataScope;
}

export interface LiveTickerRequest extends OflowRequest {
  type: OflowDataType.ticker;
  params: TickerDataScope;
}

export type LiveDataRequest = LiveKlineRequest | LiveTickerRequest;

export interface BaseSubsRequest extends OflowRequest {
  op: 'subs' | 'unsub';
  channel: OflowDataChannel;
  params: DataScope;
}

export interface KlineSubsRequest extends BaseSubsRequest {
  channel: OflowDataChannel.kline;
  params: KlineDataScope;
}

export interface TickerSubsRequest extends BaseSubsRequest {
  channel: OflowDataChannel.ticker;
  params: TickerDataScope;
}

export type SubscriptionRequest = KlineSubsRequest | TickerSubsRequest;

// response ...

export interface OflowResponse<T = any> {
  success: boolean;
  errMsg?: string;
  data: T;
}
