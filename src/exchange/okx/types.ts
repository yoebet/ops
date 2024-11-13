import { TradeSide } from '@/data-service/models/base';

export interface RestBody<T = any> {
  code: string;
  msg: string;
  data: T;
}

export interface RestTypes {
  InstType: 'SPOT' | 'MARGIN' | 'SWAP' | 'FUTURES' | 'OPTION';

  OrderType:
    | 'market'
    | 'limit'
    | 'post_only'
    | 'fok'
    | 'ioc'
    | 'optimal_limit_ioc';

  AlgoOrderType: 'conditional' | 'oco' | 'trigger' | 'move_order_stop' | 'twap';

  TradeMode: 'isolated' | 'cross' | 'cash';

  CodeAndMsg: {
    sCode: '0' | string;
    sMsg: string;
  };

  Candle: [ts: string, o: string, h: string, l: string, c: string];

  /**
   * getMarkets
   */
  Symbol: {
    alias: string;
    baseCcy: string;
    category: string;
    ctMult: string;
    ctType: string; // linear：正向合约 inverse：反向合约 仅适用于交割/永续
    ctVal: string;
    ctValCcy: string; // 合约面值计价币种，仅适用于交割/永续/期权
    expTime: string;
    instId: string;
    instType: string;
    lever: string;
    listTime: string;
    lotSz: string;
    minSz: string;
    optType: string;
    quoteCcy: string;
    settleCcy: string;
    state: string;
    stk: string;
    tickSz: string;
    uly: string;
  };

  /**
   * getPrice
   */
  Ticker: {
    instType: string;
    instId: string;
    last: string;
    lastSz: string;
    askPx: string;
    askSz: string;
    bidPx: string;
    bidSz: string;
    open24h: string;
    high24h: string;
    low24h: string;
    volCcy24h: string;
    vol24h: string;
    ts: string;
    sodUtc0: string;
    sodUtc8: string;
  };

  /**
   * getFeeRate
   */
  FeeRate: {
    category: string;
    delivery: string;
    exercise: string;
    instType: string;
    isSpecial: string;
    level: string;
    maker?: string;
    taker?: string;
    makerU?: string;
    takerU?: string;
    ts: string;
  };

  /**
   * getAccount
   */
  Account: {
    acctLv: string;
    autoLoan: boolean;
    ctIsoMode: string;
    greeksType: string;
    level: string;
    levelTmp: string;
    mgnIsoMode: string;
    posMode: string;
    uid: string;
  };

  /**
   * getMaxAvailableSize
   */
  MaxAvailableSize: {
    instId: string;
    availBuy: string; // 最大可买的交易币数量
    availSell: string; // 最大可卖的计价币数量
  };

  /**
   * getLeverageInfo
   */
  LeverageInfo: {
    instId: string;
    mgnMode: string;
    posSide: string;
    lever: string;
  };

  /**
   * getBalances
   */
  Balance: {
    adjEq: string;
    details: RestTypes['BalanceDetail'][];
    imr: string;
    isoEq: string;
    mgnRatio: string;
    mmr: string;
    notionalUsd: string;
    ordFroz: string;
    totalEq: string;
    uTime: string;
  };

  BalanceDetail: {
    availBal: string;
    availEq: string;
    cashBal: string;
    ccy: string;
    crossLiab: string;
    disEq: string;
    eq: string;
    eqUsd: string;
    frozenBal: string;
    interest: string;
    isoEq: string;
    isoLiab: string;
    isoUpl: string;
    liab: string;
    maxLoan: string;
    mgnRatio: string;
    notionalLever: string;
    ordFrozen: string;
    stgyEq: string;
    twap: string;
    uTime: string;
    upl: string;
    uplLiab: string;
  };

  /**
   * getTransfers
   */
  Bill: {
    bal: string;
    balChg: string;
    billId: string;
    ccy: string;
    execType: string;
    fee: string;
    from: string;
    instId: string;
    instType: string;
    mgnMode: string;
    notes: string;
    ordId: string;
    pnl: string;
    posBal: string;
    posBalChg: string;
    subType: string;
    sz: string;
    to: string;
    ts: string;
    type: string;
  };

  /**
   * getPositions
   */
  Position: {
    adl: string;
    availPos: string;
    avgPx: string;
    baseBal: string;
    cTime: string;
    ccy: string;
    deltaBS: string;
    deltaPA: string;
    gammaBS: string;
    gammaPA: string;
    imr: string;
    instId: string;
    instType: string;
    interest: string;
    last: string;
    lever: string;
    liab: string;
    liabCcy: string;
    liqPx: string; // 预估强平价
    margin: string;
    markPx: string;
    mgnMode: string;
    mgnRatio: string;
    mmr: string;
    notionalUsd: string;
    optVal: string;
    pos: string;
    posCcy: string;
    posId: string;
    posSide: string;
    quoteBal: string;
    thetaBS: string;
    thetaPA: string;
    tradeId: string;
    uTime: string;
    upl: string; // 未实现收益
    uplRatio: string;
    usdPx: string;
    vegaBS: string;
    vegaPA: string;
  };

  /**
   * getOrders
   */
  Order: {
    accFillSz: string;
    avgPx: string;
    cTime: string;
    category: string;
    ccy: string;
    clOrdId: string;
    fee: string;
    feeCcy: string;
    fillPx: string;
    fillSz: string;
    fillTime: string;
    instId: string;
    instType: string;
    lever: string;
    ordId: string;
    ordType: RestTypes['OrderType'];
    pnl: string;
    posSide: 'long' | 'short';
    px: string;
    rebate: string;
    rebateCcy: string;
    side: 'buy' | 'sell';
    slOrdPx: string;
    slTriggerPx: string;
    slTriggerPxType: string;
    source: string;
    // canceled：撤单成功
    // live：等待成交
    // partially_filled：部分成交
    // filled：完全成交
    // mmp_canceled：做市商保护机制导致的自动撤单
    state: string;
    sz: string;
    tag: string;
    // 交易模式
    // 保证金模式：isolated：逐仓 ；cross：全仓
    // 非保证金模式：cash：非保证金
    tdMode: RestTypes['TradeMode'];
    tgtCcy: string;
    tpOrdPx: string;
    tpTriggerPx: string;
    tpTriggerPxType: string;
    // tradeId: string;
    uTime: string;
  };

  CreateOrder: RestTypes['CancelOrder'] & {
    tag: string;
  };

  CancelOrder: {
    ordId: string;
    clOrdId: string;
  } & RestTypes['CodeAndMsg'];

  TransferResult: {
    transId: string;
    amt: string;
    ccy: string;
    clientId: string;
    from: string;
    to: string;
  };

  TransferState: {
    amt: string;
    ccy: string;
    clientId: string;
    from: string;
    instId: string;
    state: string; // 成功：success，处理中：pending，失败：failed
    subAcct: string;
    to: string;
    toInstId: string;
    transId: string;
    type: string; // 0：账户内划转 1：母账户转子账户 2：子账户转母账户
  };

  DepositAddress: {
    ccy: string; // 币种，如BTC
    addr: string; // 充值地址
    chain: string; // 币种链信息 有的币种下有多个链，必须要做区分，如USDT下有USDT-ERC20，USDT-TRC20，USDT-Omni多个链
    ctAddr: string; // 合约地址后6位
    to: string; // 转入账户 6：资金账户 18：交易账户
    selected: boolean; // 该地址是否为页面选中的地址
    addrEx?: any; // 充值地址备注，部分币种充值需要，若不需要则不返回此字段. 如币种TONCOIN的充值地址备注标签名为comment,则该字段返回：{'comment':'123456'}
    tag?: string; // 部分币种充值需要标签，若不需要则不返回此字段
    memo?: string; // 部分币种充值需要标签，若不需要则不返回此字段
    pmtId?: string; // 部分币种充值需要此字段（payment_id），若不需要则不返回此字段
  };

  DepositRecord: {
    amt: string; // 充值数量
    ccy: string; // 币种名称，如 BTC
    chain: string; // 币种链信息
    depId: string; // 充值记录 ID
    from: string; // 充值地址，只显示内部账户转账地址，不显示区块链充值地址
    state: string; // 充值状态 0：等待确认 1：确认到账 2：充值成功 8：因该币种暂停充值而未到账，恢复充值后自动到账 8（?文档如此）：账户或充值被冻结
    subAcct: string;
    to: string; // 到账地址
    ts: string; // 充值到账时间，Unix 时间戳的毫秒数格式，如 1597026383085
    txId: string; // 区块转账哈希记录 ??
  };

  WithdrawRecord: {
    ccy: string; // 币种
    chain: string; // 币种链信息
    amt: string; // 数量
    clientId: string; // 客户自定义ID
    fee: string; // 提币手续费
    txId: string; // 提币哈希记录（内部转账将不返回此字段）
    from: string; // 提币地址（如果收币地址是 OKX 平台地址，则此处将显示用户账户）
    to: string; // 收币地址
    state: string; // 提币状态 -3：撤销中 -2：已撤销 -1：失败 0：等待提现 1：提现中 2：已汇出 3：邮箱确认 4：人工审核中 5：等待身份认证
    ts: string; // 提币申请时间，Unix 时间戳的毫秒数格式，如 1597026383085
    wdId: string; // 提币申请ID
    tag?: string; // 部分币种充值需要标签，若不需要则不返回此字段
    memo?: string; // 部分币种充值需要标签，若不需要则不返回此字段
    pmtId?: string; // 部分币种充值需要此字段（payment_id），若不需要则不返回此字段
  };

  AssetCurrency: {
    ccy: string; // 币种名称，如 BTC
    name: string; // 币种中文名称，不显示则无对应名称
    logoLink: string; // 币种Logo链接
    chain: string; // 币种链信息
    canWd: boolean; // 是否可提币，false表示不可链上提币，true表示可以链上提币
    canDep: boolean; // 是否可充值，false表示不可链上充值，true表示可以链上充值
    canInternal: boolean; // 是否可内部转账，false表示不可内部转账，true表示可以内部转账
    minWd: string; // 币种单笔最小提币量
    maxWd: string; // 币种单笔最大提币量
    wdTickSz: string; // 提币精度,表示小数点后的位数
    wdQuota: string; // 过去24小时内提币额度，单位为BTC
    usedWdQuota: string; // 过去24小时内已用提币额度，单位为BTC
    minFee: string; // 最小提币手续费数量
    maxFee: string; // 最大提币手续费数量
    mainNet: boolean; // 当前链是否为主链
  };

  SubAccount: {
    canTransOut: boolean;
    enable: boolean;
    gAuth: boolean;
    label: string;
    mobile: string;
    subAcct: string;
    ts: string;
    type: string;
  };
}

// 获取充值记录 参数
export interface GetDepositRecordsParams {
  ccy?: string; // 币种名称，如 BTC
  depId?: string; // 充值记录 ID
  txId?: string; // 区块转账哈希记录
  state?: string; // 充值状态 0：等待确认 1：确认到账 2：充值成功
  after?: number; // 查询在此之前的内容，值为时间戳，Unix 时间戳为毫秒数格式，如 1597026383085
  before?: number; // 查询在此之后的内容，值为时间戳，Unix 时间戳为毫秒数格式，如 1597026383085
  limit?: number; // 返回的结果集数量，默认为100，最大为100
}

// 获取提币记录 参数
export interface GetWithdrawRecordsParams {
  ccy?: string; // 币种名称，如 BTC
  wdId?: string; // 提币申请ID
  clientId?: string; // 客户自定义ID 字母（区分大小写）与数字的组合，可以是纯字母、纯数字且长度要在1-32位之间。
  txId?: string; // 区块转账哈希记录
  state?: string; // 提币状态 -3：撤销中 -2：已撤销 -1：失败 0：等待提现 1：提现中 2：已汇出 3：邮箱确认 4：人工审核中 5：等待身份认证
  after?: number; // 查询在此之前的内容，值为时间戳，Unix 时间戳为毫秒数格式，如 1597026383085
  before?: number; // 查询在此之后的内容，值为时间戳，Unix 时间戳为毫秒数格式，如 1597026383085
  limit?: number; // 返回的结果集数量，默认为100，最大为100
}

// 提币申请 参数
export interface WithdrawalParams {
  ccy: string; // 币种
  amt: string; // 数量
  dest: '3' | '4'; //提币到 3：OKX 4：数字货币地址
  toAddr: string; // 某些数字货币地址格式为:地址+标签，如 ARDOR-7JF3-8F2E-QUWZ-CAN7F:123456
  fee: string; // 网络手续费≥0，提币到数字货币地址所需网络手续费可通过获取币种列表接口查询
  chain?: string; // 币种链信息
  clientId?: string; // 客户自定义ID
}

export interface InterestAccrued {
  ccy: string;
  instId: string;
  interest: string;
  interestRate: string;
  liab: string;
  mgnMode: string;
  ts: string;
  type: string;
}

export interface OrderAlgoParams {
  attachAlgoClOrdId?: string;
  tpTriggerPx?: string;
  tpOrdPx?: string;
  tpOrdKind?: string;
  slTriggerPx?: string;
  slOrdPx?: string;
  tpTriggerPxType?: string;
  slTriggerPxType?: string;
  sz?: string;
  amendPxOnTriggerType?: string;
}

export interface CreateOrderParamsBase {
  instId: string;
  tdMode: RestTypes['TradeMode']; // 交易模式
  ccy?: string; // 保证金币种，仅适用于现货和合约模式下的全仓杠杆订单
  tag?: string; // 订单标签，字母（区分大小写）与数字的组合，可以是纯字母、纯数字，且长度在1-16位之
  side: RestTypes['Order']['side'];
  posSide?: RestTypes['Order']['posSide']; // 持仓方向 在双向持仓模式下必填
  tgtCcy?: 'base_ccy' | 'quote_ccy'; // 市价单委托数量sz的单位，仅适用于币币市价订单。买单默认quote_ccy， 卖单默认base_ccy
  sz: string; // 委托数量
  reduceOnly?: boolean; // 是否只减仓
}

export interface CreateOrderParams extends CreateOrderParamsBase {
  clOrdId?: string; // 客户自定义订单ID，字母（区分大小写）与数字的组合，可以是纯字母、纯数字且长度要在1-32位之间。
  ordType: RestTypes['OrderType'];
  px?: string; // 委托价格
  attachAlgoOrds?: [OrderAlgoParams];
}

export interface CreateAlgoOrderParams extends CreateOrderParamsBase {
  algoClOrdId?: string;
  ordType: RestTypes['AlgoOrderType'];
  // px?: string; // 委托价格
  // closeFraction?: string;
  // 止盈止损 ordType=conditional
  tpTriggerPx?: string;
  tpTriggerPxType?: string;
  tpOrdPx?: string;
  tpOrdKind?: string;
  slTriggerPx?: string;
  slTriggerPxType?: string;
  slOrdPx?: string;
  cxlOnClosePos?: string;
  // 计划委托 ...
  // 移动止盈止损 ...
  callbackRatio?: string;
  callbackSpread?: string;
  activePx?: string;
}

export interface TradeTicker {
  instId: string;
  tradeId: string;
  px: string;
  sz: string;
  side: TradeSide;
  ts: string; // ms
}

export type CandleRawDataOkx = [
  string, // 0开盘时间
  string, // 1开盘价
  string, // 2最高价
  string, // 3最低价
  string, // 4收盘价(当前K线未结束的即为最新价)
  string, // 5交易量，以张为单位 如果是衍生品合约，数值为合约的张数。如果是币币/币币杠杆，数值为交易货币的数量。
  string, // 6交易量，以币为单位 如果是衍生品合约，数值为交易货币的数量。如果是币币/币币杠杆，数值为计价货币的数量。
  string, // 7交易量，以计价货币为单位 如：BTC-USDT 和 BTC-USDT-SWAP, 单位均是 USDT；BTC-USD-SWAP 单位是 USD
  string, // 8 K线状态 0 代表 K 线未完结，1 代表 K 线已完结。
];

export interface TradeRawDataOkx {
  instId: string;
  tradeId: string;
  px: string; //Trade price
  sz: string; //Trade quantity
  side: string; //Trade side buy||sell
  ts: string; //Trade time, Unix timestamp format in milliseconds, e.g. 1597026383085
}
