// 下单参数
export interface CreateOrderParamsBase {
  symbol: string;
  side: 'BUY' | 'SELL';
  type:
    | 'STOP_LOSS' // 止损单
    | 'STOP_LOSS_LIMIT' // 限价止损单
    | 'TAKE_PROFIT' // 止盈单
    | 'TAKE_PROFIT_LIMIT' // 限价止盈单
    | 'LIMIT_MAKER' // 限价只挂单
    | 'LIMIT' // 限价单
    | 'MARKET'; // 市价单
  quantity?: string;
  quoteOrderQty?: string;
  price?: string;
  // 与 STOP_LOSS, STOP_LOSS_LIMIT, TAKE_PROFIT, 和 TAKE_PROFIT_LIMIT 订单一起使用
  stopPrice?: string;
  // 客户自定义的唯一订单ID。若未发送自动生成
  newClientOrderId?: string;
  // 与 LIMIT, STOP_LOSS_LIMIT, 和 TAKE_PROFIT_LIMIT 一起使用创建 iceberg 订单
  icebergQty?: string;
  // 设置响应 JSON
  // MARKET 和 LIMIT 订单类型默认为 FULL, 所有其他订单默认为 ACK
  newOrderRespType?: 'ACK' | 'RESULT' | 'FULL';
  // 默认为 NO_SIDE_EFFECT
  sideEffectType?: 'NO_SIDE_EFFECT' | 'MARGIN_BUY' | 'AUTO_REPAY';
  // 有效方式, 定义了订单多久能够失效
  // GTC: 成交为止. 订单会一直有效，直到被成交或者取消。
  // IOC: 无法立即成交的部分就撤销. 订单在失效前会尽量多的成交。
  // FOK: 无法全部立即成交就撤销. 如果无法全部成交，订单会失效。
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

export interface CreateSpotOrderParams extends CreateOrderParamsBase {
  trailingDelta?: number; // bp
}

export interface CreateMarginOrderParams extends CreateOrderParamsBase {
  isIsolated?: boolean;
}

export interface OrderResponse {
  stopPrice: string;
  icebergQty: string;
  time: number;
  updateTime: number;
  isWorking: true;
  origQuoteOrderQty: string;

  symbol: string;
  orderId: number;
  orderListId: number;
  clientOrderId: string;
  transactTime: number;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  // NEW	订单被交易引擎接受
  // PARTIALLY_FILLED	部分订单被成交
  // FILLED	订单完全成交
  // CANCELED	用户撤销了订单
  // PENDING_CANCEL	撤销中（目前并未使用）
  // REJECTED	订单没有被交易引擎接受，也没被处理
  // EXPIRED	订单被交易引擎取消，比如：
  //    LIMIT FOK 订单没有成交
  //    市价单没有完全成交
  //    强平期间被取消的订单
  //    交易所维护期间被取消的订单
  // EXPIRED_IN_MATCH	表示订单由于 STP 触发而过期 （e.g. 带有 EXPIRE_TAKER 的订单与订单簿上属于同账户或同 tradeGroupId 的订单撮合
  status: string;
  timeInForce: string;
  type: string;
  side: string;
  workingTime: number;
  fills: {
    price: string;
    qty: string;
    commission: string;
    commissionAsset: string;
    tradeId: number;
  }[];
  selfTradePreventionMode: string;
}

export interface MarginPair {
  symbol: string;
  base: string;
  quote: string;
  isMarginTrade: boolean;
  isBuyAllowed: boolean;
  isSellAllowed: boolean;
}

export interface SymbolInfo {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  isMarginTradingAllowed: boolean;
  filters: {
    filterType: string;
  }[];
  permissions: string[];
}

export type ExchangeInfo = {
  timezone: string;
  serverTime: number;
  rateLimits: any[];
  symbols: SymbolInfo[];
};

export interface DepositAddress {
  coin: string;
  address: string;
  tag: string;
  url: string;
}

export interface AssetTransferRecord {
  timestamp: number;
  asset: string;
  amount: string;
  type: string;
  status: string;
  tranId: number;
}

export interface DWRecordsParamsBase {
  startTime?: number; // 默认当前时间90天前的时间戳
  endTime?: number; // 默认当前时间戳
  offset?: number; // 默认： 0
  limit?: number; // 默认：1000，最大1000
}

export interface DepositRecord {
  amount: string;
  coin: string;
  network: string;
  status: number;
  address: string;
  addressTag: string;
  txId: string;
  insertTime: number;
  transferType: number;
  unlockConfirm: string;
  confirmTimes: string;
  walletType: number;
}

export interface WithdrawRecord {
  address: string;
  amount: string;
  applyTime: string;
  coin: string;
  id: string;
  network: string;
  transferType: number;
  status: number; // 0(0:已发送确认Email,1:已被用户取消 2:等待确认 3:被拒绝 4:处理中 5:提现交易失败 6 提现完成)
  transactionFee: string;
  confirmNo: number;
  info: string;
  txId: string;
}

export interface SubAccount {
  email: string;
  isFreeze: boolean;
  createTime: number;
  isManagedSubAccount: boolean;
  isAssetManagementSubAccount: boolean;
}

export declare type MainSubTransferAccountType =
  | 'SPOT'
  | 'USDT_FUTURE'
  | 'COIN_FUTURE'
  | 'MARGIN'
  | 'ISOLATED_MARGIN';

export interface MainSubTransferParams {
  fromEmail?: string;
  toEmail?: string;
  clientTranId?: string;
  fromAccountType: MainSubTransferAccountType;
  toAccountType: MainSubTransferAccountType;
  symbol?: string; // 仅在ISOLATED_MARGIN类型下使用
  asset: string;
  amount: number;
}

// ws & rest
export interface TradeTicker {
  e: string; //事件 "trade"
  E: number; //事件时间戳
  s: string; //symbol
  t: string; //交易ID
  p: string; //成交价格
  q: string; //成交数量
  T: number; //成交时间戳
  m: boolean; //是否是买方
}

export type Candle = [
  number, // 0开盘时间
  string, // 1开盘价
  string, // 2最高价
  string, // 3最低价
  string, // 4收盘价(当前K线未结束的即为最新价)
  string, // 5成交量
  number, // 6收盘时间
  string, // 7成交额(标的数量)
  number, // 8成交笔数
  string, // 9主动买入成交量
  string, // 10主动买入成交额(标的数量)
  string, // 11请忽略该参数
];

export interface WsCandle {
  t: number; // 这根K线的起始时间
  T: number; // 这根K线的结束时间
  s: string; // 交易对
  i: string; // K线间隔
  f: number; // 这根K线期间第一笔成交ID
  L: number; // 这根K线期间末一笔成交ID
  o: string; // 这根K线期间第一笔成交价
  c: string; // 这根K线期间末一笔成交价
  h: string; // 这根K线期间最高成交价
  l: string; // 这根K线期间最低成交价
  v: string; // 这根K线期间成交量
  n: number; // 这根K线期间成交笔数
  x: boolean; // 这根K线是否完结(是否已经开始下一根K线)
  q: string; // 这根K线期间成交额
  V: string; // 主动买入的成交量
  Q: string; // 主动买入的成交额
  B: string; // 忽略此参数
}

export interface TradeRaw {
  id: number;
  price: string;
  qty: string;
  quoteQty: string;
  time: number;
  isBuyerMaker: boolean;
  isBestMatch?: boolean;
}
