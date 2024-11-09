// 下单参数
export interface PlaceOrderParams {
  symbol: string;
  isIsolated?: boolean;
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
  timeInForce: 'GTC' | 'IOC' | 'FOK';
}

export interface MarginPair {
  symbol: string;
  base: string;
  quote: string;
  isMarginTrade: boolean;
  isBuyAllowed: boolean;
  isSellAllowed: boolean;
}

export interface PairDetail {
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

export type ExchangeInfoAll = {
  timezone: string;
  serverTime: number;
  rateLimits: any[];
  symbols: PairDetail[];
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
