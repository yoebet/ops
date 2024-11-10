import { BinanceBaseRest } from '@/exchange/binance/rest';
import { ExRestParams, HttpMethodType } from '@/exchange/base/rest/rest.type';
import { ExAccountCode } from '@/db/models/exchange-types';
import { ExApiKey } from '@/exchange/base/api-key';
import {
  AssetTransferRecord,
  DepositAddress,
  DepositRecord,
  DWRecordsParamsBase,
  MainSubTransferParams,
  SubAccount,
  WithdrawRecord,
  ExchangeInfoAll,
  MarginPair,
  PlaceOrderParams,
} from '@/exchange/binance/types';

export class BinanceSpotRest extends BinanceBaseRest {
  constructor(params?: Partial<ExRestParams>) {
    super({
      host: 'api.binance.com',
      exAccount: ExAccountCode.binanceSpot,
      ...params,
    });
  }

  // 特定用户的币种信息（是否可存/可取，默认网络）
  async getCapitalConfigs(apiKey: ExApiKey): Promise<any[]> {
    return this.request({
      path: `/sapi/v1/capital/config/getall`,
      method: HttpMethodType.get,
      apiKey,
    });
  }

  // 资金账户
  async getFundingAssets(
    apiKey: ExApiKey,
    params?: { asset?: string },
  ): Promise<any[]> {
    return this.request({
      path: `/sapi/v1/asset/get-funding-asset`,
      method: HttpMethodType.post,
      params,
      apiKey,
    });
  }

  // 获取充币地址
  async getDepositAddress(
    apiKey: ExApiKey,
    params: {
      coin: string;
      network?: string;
    },
  ): Promise<DepositAddress> {
    return this.request({
      path: `/sapi/v1/capital/deposit/address`,
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 获取充币历史
  async getDepositRecords(
    apiKey: ExApiKey,
    params: {
      coin?: string;
      status?: number; // 0 (0:pending,6: credited but cannot withdraw, 1:success)
    } & DWRecordsParamsBase,
  ): Promise<DepositRecord[]> {
    return this.request({
      path: `/sapi/v1/capital/deposit/hisrec`,
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 获取提币历史
  async getWithdrawRecords(
    apiKey: ExApiKey,
    params: {
      coin?: string;
      withdrawOrderId?: string;
      status?: number; // 0 (0:已发送确认Email,1:已被用户取消 2:等待确认 3:被拒绝 4:处理中 5:提现交易失败 6 提现完成)
    } & DWRecordsParamsBase,
  ): Promise<WithdrawRecord[]> {
    return this.request({
      path: `/sapi/v1/capital/withdraw/history`,
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 提币
  async withdrawApply(
    apiKey: ExApiKey,
    params: {
      coin: string;
      address: string; // 提币地址
      amount: number; // 数量
      withdrawOrderId?: string; // 自定义提币ID
      network?: string; // 提币网络
      addressTag?: string; // 某些币种例如 XRP,XMR 允许填写次级地址标签
      transactionFeeFlag?: boolean; // 当站内转账时免手续费, true: 手续费归资金转入方; false: 手续费归资金转出方; . 默认 false.
      name?: string; // 地址的备注，填写该参数后会加入该币种的提现地址簿。地址簿上限为20，超出后会造成提现失败。地址中的空格需要encode成%20
      walletType?: number; // 表示出金使用的钱包，0为现货钱包，1为资金钱包，默认为现货钱包
    },
  ): Promise<{ id: string }> {
    return this.request({
      path: `/sapi/v1/capital/withdraw/apply`,
      method: HttpMethodType.post,
      apiKey,
      params,
    });
  }

  // 用户万向划转
  // type:
  // MAIN_UMFUTURE 现货钱包转向U本位合约钱包
  // MAIN_CMFUTURE 现货钱包转向币本位合约钱包
  // MAIN_MARGIN 现货钱包转向杠杆全仓钱包
  // UMFUTURE_MAIN U本位合约钱包转向现货钱包
  // UMFUTURE_MARGIN U本位合约钱包转向杠杆全仓钱包
  // CMFUTURE_MAIN 币本位合约钱包转向现货钱包
  // MARGIN_MAIN 杠杆全仓钱包转向现货钱包
  // MARGIN_UMFUTURE 杠杆全仓钱包转向U本位合约钱包
  // MARGIN_CMFUTURE 杠杆全仓钱包转向币本位合约钱包
  // CMFUTURE_MARGIN 币本位合约钱包转向杠杆全仓钱包
  // ISOLATEDMARGIN_MARGIN 杠杆逐仓钱包转向杠杆全仓钱包
  // MARGIN_ISOLATEDMARGIN 杠杆全仓钱包转向杠杆逐仓钱包
  // ISOLATEDMARGIN_ISOLATEDMARGIN 杠杆逐仓钱包转向杠杆逐仓钱包
  // MAIN_FUNDING 现货钱包转向资金钱包
  // FUNDING_MAIN 资金钱包转向现货钱包
  // FUNDING_UMFUTURE 资金钱包转向U本位合约钱包
  // UMFUTURE_FUNDING U本位合约钱包转向资金钱包
  // MARGIN_FUNDING 杠杆全仓钱包转向资金钱包
  // FUNDING_MARGIN 资金钱包转向杠杆全仓钱包
  // FUNDING_CMFUTURE 资金钱包转向币本位合约钱包
  // CMFUTURE_FUNDING 币本位合约钱包转向资金钱包
  //
  // fromSymbol 必须要发送，当类型为 ISOLATEDMARGIN_MARGIN 和 ISOLATEDMARGIN_ISOLATEDMARGIN
  // toSymbol 必须要发送，当类型为 MARGIN_ISOLATEDMARGIN 和 ISOLATEDMARGIN_ISOLATEDMARGIN
  async assetTransfer(
    apiKey: ExApiKey,
    params: {
      type: string; // FUNDING/MAIN/MARGIN/CMFUTURE/UMFUTURE <> ...
      asset: string;
      amount: number;
      fromSymbol?: string;
      toSymbol?: string;
    },
  ): Promise<{ tranId: number }> {
    const res = await this.request({
      path: `/sapi/v1/asset/transfer`,
      method: HttpMethodType.post,
      apiKey,
      params,
    });
    return res;
  }

  // 查询用户万向划转历史
  // 仅支持查询最近半年（6个月）数据
  // 若startTime和endTime没传，则默认返回最近7天数据
  async getAssetTransferRecords(
    apiKey: ExApiKey,
    params: {
      type: string;
      startTime?: number;
      endTime?: number;
      current?: number; // 默认 1
      size?: number; // 默认 10, 最大 100
      fromSymbol?: string;
      toSymbol?: string;
    },
  ): Promise<{ total: number; rows: AssetTransferRecord[] }> {
    return this.request({
      path: `/sapi/v1/asset/transfer`,
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 子母账户万能划转 (适用主账户)
  // https://binance-docs.github.io/apidocs/spot/cn/#c2d564529d
  async subAccountAssetTransfer(
    apiKey: ExApiKey,
    params: MainSubTransferParams,
  ): Promise<{ tranId: number }> {
    return this.request({
      path: `/sapi/v1/sub-account/universalTransfer`,
      method: HttpMethodType.post,
      apiKey,
      params,
    });
  }

  // 查询子母账户万能划转历史 (适用主账户)
  // https://binance-docs.github.io/apidocs/spot/cn/#5f274ef2c2
  async getSubAccountTransferRecords(
    apiKey: ExApiKey,
    params: {
      fromEmail?: string;
      toEmail?: string;
      clientTranId?: string;
      startTime?: number;
      endTime?: number;
      page?: number; // 默认 1
      limit?: number; // 默认 500, 最大 500
    },
  ): Promise<{ totalCount: number; result: any[] }> {
    return this.request({
      path: `/sapi/v1/sub-account/universalTransfer`,
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 查询子账户列表（适用主账户）
  // https://binance-docs.github.io/apidocs/spot/cn/#bd2019e819
  async getSubAccounts(
    apiKey: ExApiKey,
    params?: {
      email?: string;
      isFreeze?: boolean;
    },
  ): Promise<{ subAccounts: SubAccount[]; success: boolean }> {
    return this.request({
      path: `/sapi/v1/sub-account/list`,
      method: HttpMethodType.get,
      params,
      apiKey,
    });
  }

  // 获取所有交易对及相应的价格精度、最小数量等
  async getExchangeInfoAll(): Promise<ExchangeInfoAll> {
    return this.request({
      path: '/api/v3/exchangeInfo',
      method: HttpMethodType.get,
    });
  }

  // 价格指数
  async getPriceIndex(apiKey: ExApiKey, symbol: string): Promise<number> {
    const res = await this.request({
      path: '/sapi/v1/margin/priceIndex',
      method: HttpMethodType.get,
      apiKey,
      params: {
        symbol,
      },
    });
    if (res.price == null) {
      throw new Error(`'price' is missing`);
    }
    return +res.price;
  }

  // 获取所有全仓杠杆交易对
  async getAllCrossPairs(apiKey: ExApiKey): Promise<MarginPair[]> {
    return this.request({
      path: '/sapi/v1/margin/allPairs',
      method: HttpMethodType.get,
      apiKey,
    });
  }

  // 查询杠杆资产
  async getMarginAsset(apiKey: ExApiKey, asset: string): Promise<MarginPair[]> {
    return this.request({
      path: '/sapi/v1/margin/asset',
      method: HttpMethodType.get,
      apiKey,
      params: { asset },
    });
  }

  // 获取所有杠杆资产信息
  async getAllMarginAssets(apiKey: ExApiKey): Promise<MarginPair[]> {
    return this.request({
      path: '/sapi/v1/margin/allAssets',
      method: HttpMethodType.get,
      apiKey,
    });
  }

  // 查询全仓杠杆账户详情
  async getMarginAccount(apiKey: ExApiKey): Promise<any> {
    return this.request({
      path: '/sapi/v1/margin/account',
      method: HttpMethodType.get,
      apiKey,
    });
  }

  // 查询杠杆账户订单
  async getMarginAllOrders(
    apiKey: ExApiKey,
    params: { symbol: string; isIsolated: boolean },
  ): Promise<any> {
    return this.request({
      path: '/sapi/v1/margin/allOrders',
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 查询杠杆账户交易历史
  async getMarginMyTrades(
    apiKey: ExApiKey,
    params: { symbol: string; isIsolated: boolean },
  ): Promise<any> {
    return this.request({
      path: '/sapi/v1/margin/myTrades',
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 查询账户最大可借贷额度
  async getMaxBorrowable(
    apiKey: ExApiKey,
    params: {
      asset: string;
      isolatedSymbol?: string; // 逐仓交易对，适用于逐仓查询
    },
  ): Promise<any> {
    return this.request({
      path: '/sapi/v1/margin/maxBorrowable',
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 查询最大可转出额
  async getMaxTransferable(
    apiKey: ExApiKey,
    params: {
      asset: string;
      isolatedSymbol?: string; // 逐仓交易对，适用于逐仓查询
    },
  ): Promise<any> {
    return this.request({
      path: '/sapi/v1/margin/maxTransferable',
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 获取BNB抵扣开关状态
  async getBnbBurn(apiKey: ExApiKey): Promise<any> {
    return this.request({
      path: '/sapi/v1/bnbBurn',
      method: HttpMethodType.get,
      apiKey,
    });
  }

  // 获取全仓杠杆利率及限额
  async getCrossMarginData(
    apiKey: ExApiKey,
    params: {
      vipLevel?: number;
      coin?: string;
    },
  ): Promise<any> {
    return this.request({
      path: '/sapi/v1/margin/crossMarginData',
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 获取逐仓杠杆利率及限额
  async getIsolatedMarginData(
    apiKey: ExApiKey,
    params: {
      vipLevel?: number;
      symbol?: string;
    },
  ): Promise<any> {
    return this.request({
      path: '/sapi/v1/margin/isolatedMarginData',
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 获取逐仓档位信息
  async getIsolatedMarginTier(
    apiKey: ExApiKey,
    params: {
      symbol: string;
      tier?: number; // 不传则返回所有逐仓杠杆档位
    },
  ): Promise<any> {
    return this.request({
      path: '/sapi/v1/margin/isolatedMarginTier',
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 获取全仓杠杆划转历史
  async getCrossTransferHistory(
    apiKey: ExApiKey,
    params: {
      asset?: string;
    },
  ): Promise<any> {
    return this.request({
      path: '/sapi/v1/margin/transfer',
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 查询借贷记录
  async getMarginLoanHistory(
    apiKey: ExApiKey,
    params: {
      asset: string;
      isolatedSymbol?: string;
    },
  ): Promise<any> {
    return this.request({
      path: '/sapi/v1/margin/loan',
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 查询还贷记录
  async getMarginRepayHistory(
    apiKey: ExApiKey,
    params: {
      asset: string;
      isolatedSymbol?: string;
    },
  ): Promise<any> {
    return this.request({
      path: '/sapi/v1/margin/repay',
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 获取账户强制平仓记录
  async getForceLiquidationRecords(
    apiKey: ExApiKey,
    params: {
      isolatedSymbol?: string;
    },
  ): Promise<any> {
    return this.request({
      path: '/sapi/v1/margin/forceLiquidationRec',
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 获取利息历史
  async getInterestHistory(
    apiKey: ExApiKey,
    params: {
      asset?: string;
      isolatedSymbol?: string;
    },
  ): Promise<any> {
    return this.request({
      path: '/sapi/v1/margin/interestHistory',
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 杠杆账户下单
  async getOrder(
    apiKey: ExApiKey,
    params: {
      symbol: string;
      isIsolated?: boolean;
      orderId?: string;
      origClientOrderId?: string;
    },
  ): Promise<any> {
    return this.request({
      path: '/sapi/v1/margin/order',
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 杠杆账户下单
  async getOpenOrders(
    apiKey: ExApiKey,
    params: {
      // 如果 isIsolated 为 true, symbol 为必填
      symbol?: string;
      isIsolated?: boolean;
    },
  ): Promise<any> {
    return this.request({
      path: '/sapi/v1/margin/openOrders',
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 杠杆账户下单
  async getAllOrders(
    apiKey: ExApiKey,
    params: {
      // 如果 isIsolated 为 true, symbol 为必填
      symbol: string;
      isIsolated?: boolean;
      // orderId?	LONG	如果设置 orderId, 获取订单 >= orderId， 否则返回近期订单历史
      // startTime?	LONG
      // endTime?	LONG
    },
  ): Promise<any> {
    // 一些历史订单的 cummulativeQuoteQty < 0, 是指当前数据不存在
    return this.request({
      path: '/sapi/v1/margin/allOrders',
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // *********** 非 GET 接口（POST/DELETE/...） ***********

  // 现货交易和杠杆利息BNB抵扣开关
  async setBnbBurn(
    apiKey: ExApiKey,
    // "spotBNBBurn" 和 "interestBNBBurn" 二者必须传至少一个
    params: {
      spotBNBBurn?: boolean; // 是否使用BNB支付现货交易的手续费
      interestBNBBurn?: boolean; // 是否使用BNB支付杠杆贷款的利息
    },
  ): Promise<any> {
    return this.request({
      path: '/sapi/v1/bnbBurn',
      method: HttpMethodType.post,
      apiKey,
      params,
    });
  }

  // 全仓杠杆账户划转
  async crossTransfer(
    apiKey: ExApiKey,
    params: {
      asset: string;
      amount: string;
      type: 1 | 2; // 1: 主账户向全仓杠杆账户划转 2: 全仓杠杆账户向主账户划转
    },
  ): Promise<any> {
    return this.request({
      path: '/sapi/v1/margin/transfer',
      method: HttpMethodType.post,
      apiKey,
      params,
    });
  }

  // 杠杆账户借贷
  async marginLoan(
    apiKey: ExApiKey,
    params: {
      asset: string;
      isIsolated?: boolean;
      symbol?: string;
      amount: string;
    },
  ): Promise<any> {
    return this.request({
      path: '/sapi/v1/margin/loan',
      method: HttpMethodType.post,
      apiKey,
      params,
    });
  }

  // 杠杆账户借贷
  async marginRepay(
    apiKey: ExApiKey,
    params: {
      asset: string;
      isIsolated?: boolean;
      symbol?: string;
      amount: string;
    },
  ): Promise<any> {
    return this.request({
      path: '/sapi/v1/margin/repay',
      method: HttpMethodType.post,
      apiKey,
      params,
    });
  }

  // 杠杆账户下单
  async placeOrder(apiKey: ExApiKey, params: PlaceOrderParams): Promise<any> {
    return this.request({
      path: '/sapi/v1/margin/order',
      method: HttpMethodType.post,
      apiKey,
      params,
    });
  }

  // 杠杆账户撤销订单
  async cancelOrder(
    apiKey: ExApiKey,
    params: {
      symbol: string;
      isIsolated?: boolean;
      orderId: string;
    },
  ): Promise<any> {
    return this.request({
      path: '/sapi/v1/margin/order',
      method: HttpMethodType.delete,
      apiKey,
      params,
    });
  }

  // 杠杆账户撤销单一交易对的所有挂单
  async cancelOpenOrders(
    apiKey: ExApiKey,
    params: {
      symbol: string;
      isIsolated?: boolean;
    },
  ): Promise<any> {
    return this.request({
      path: '/sapi/v1/margin/openOrders',
      method: HttpMethodType.delete,
      apiKey,
      params,
    });
  }
}
