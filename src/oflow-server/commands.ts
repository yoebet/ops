import { OflowDataChannel, OflowDataType } from '@/oflow-server/constants';

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

export interface UserDataRequest extends OflowRequest {
  cat: string;
  op: 'load' | 'save';
  scope: string; // BTC
  key?: string; // template name
  params?: any;
}

export interface ExSymbolScope {
  ex: string;
  symbol: string;

  baseCoin?: string;
  // 多symbol聚合请求，如有则忽略ex/symbol。不会为空数组[]
  exSymbols?: { ex: string; symbols: string[] }[];
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

export interface FPDataScope extends KlineDataScope {
  prl: number;
}

export interface BlockDataScope extends ExSymbolScope {
  type: 'AMOUNT' | 'SIZE';
  // 查询大单明细才会用到
  slices?: SliceCondition[];
}

export type SliceCondition = {
  field: string;
  range: [undefined | number, undefined | number];
};

export type DataScope =
  | KlineDataScope
  | FPDataScope
  | TickerDataScope
  | BlockDataScope;

export interface TimeRange {
  timeFrom: number;
  timeTo?: number;
  limit?: number;
}

export interface TickerQueryParams extends TickerDataScope, TimeRange {}

export interface KlineQueryParams extends KlineDataScope, TimeRange {}

export interface FPQueryParams extends FPDataScope, TimeRange {}

export interface BlockQueryParams extends BlockDataScope, TimeRange {}

export type DataRequestParams =
  | KlineQueryParams
  | FPQueryParams
  | TickerQueryParams
  | BlockQueryParams;

export interface AggField {
  // field是前端接口的数据字段，可能要映射成数据库字段
  field: string;
  // 返回数据的key，未设置用field
  name?: string;
  // count/sum/min/max/avg/earliest/latest/...
  method?: string;
}

// export interface CompactAggRequestParams extends DataRequestParams {
//   // method default: sum
//   aggFields: (AggField | Omit<AggField, 'method'> | string)[];
//   groupFields?: string[];
//   // ticker query
//   rangeGroup?: AggregateRequestParams['rangeGroup'];
// }

export interface AggregateParams {
  aggFields: AggField[];
  groupFields?: string[];
}

export interface KlineAggregateParams
  extends KlineQueryParams,
    AggregateParams {}

export interface FPAggregateParams extends FPQueryParams, AggregateParams {}

export interface BlockAggregateParams
  extends BlockQueryParams,
    AggregateParams {
  rangeGroup?: {
    // not in aggFields
    field: string;
    // field name; field value: 1,2,3,...
    name: string;
    divides: number[];
  };
}

export interface TickerAggregateParams
  extends TickerQueryParams,
    AggregateParams {
  rangeGroup?: {
    // not in aggFields
    field: string;
    // field name; field value: 1,2,3,...
    name: string;
    divides: number[];
  };
  timeGroup?: {
    field?: string; // ts
    name: string;
    // FLOOR/CEIL(timestamp_expr TO unit), unit: SECOND, MINUTE, HOUR, DAY, WEEK, MONTH, QUARTER, or YEAR
    method: string; // 暂支持：floor/ceil
    ps?: string[];
  };
}

export type AggregateRequestParams =
  | KlineAggregateParams
  | FPAggregateParams
  | TickerAggregateParams
  | BlockAggregateParams;

export interface KlineDataRequest extends OflowRequest {
  type: OflowDataType.kline;
  params: KlineQueryParams | KlineAggregateParams;
}

export interface FPDataRequest extends OflowRequest {
  type: OflowDataType.footprint;
  params: FPQueryParams | FPAggregateParams;
}

export interface TickerDataRequest extends OflowRequest {
  type: OflowDataType.ticker;
  params: TickerQueryParams | TickerAggregateParams;
}

export interface BlockDataRequest extends OflowRequest {
  type: OflowDataType.block;
  params: BlockQueryParams | BlockAggregateParams;
}

export type DataRequest =
  | KlineDataRequest
  | FPDataRequest
  | TickerDataRequest
  | BlockDataRequest;

export interface LiveKlineRequest extends OflowRequest {
  type: OflowDataType.kline;
  floorInv?: string;
  params: KlineDataScope;
}

export interface LiveFPRequest extends OflowRequest {
  type: OflowDataType.footprint;
  floorInv?: string;
  params: FPDataScope;
}

export interface LiveTickerRequest extends OflowRequest {
  type: OflowDataType.ticker;
  floorInv?: string; //不生效
  params: TickerDataScope;
}

export type LiveDataRequest =
  | LiveKlineRequest
  | LiveFPRequest
  | LiveTickerRequest;

export interface BaseSubsRequest extends OflowRequest {
  op: 'subs' | 'unsub';
  channel: OflowDataChannel;
  params: DataScope;
}

export interface KlineSubsRequest extends BaseSubsRequest {
  channel: OflowDataChannel.kline;
  params: KlineDataScope;
}

export interface FPSubsRequest extends BaseSubsRequest {
  channel: OflowDataChannel.footprint;
  params: FPDataScope;
}

export interface TickerSubsRequest extends BaseSubsRequest {
  channel: OflowDataChannel.ticker;
  params: TickerDataScope;
}

export type SubscriptionRequest =
  | KlineSubsRequest
  | FPSubsRequest
  | TickerSubsRequest;

// response ...

export interface OflowResponse<T = any> {
  success: boolean;
  errMsg?: string;
  data: T;
}
