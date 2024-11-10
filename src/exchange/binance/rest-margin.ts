import { BinanceBaseRest } from '@/exchange/binance/rest';
import { ExRestParams, HttpMethodType } from '@/exchange/base/rest/rest.type';
import { ExAccountCode } from '@/db/models/exchange-types';
import { ExApiKey } from '@/exchange/base/api-key';
import { MarginPair, CreateOrderParams } from '@/exchange/binance/types';

export class BinanceMarginRest extends BinanceBaseRest {
  constructor(params?: Partial<ExRestParams>) {
    super({
      host: 'api.binance.com',
      exAccount: ExAccountCode.binanceSpot,
      ...params,
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

  async getOpenOrders(
    apiKey: ExApiKey,
    params: {
      // 如果 isIsolated 为 true, symbol 为必填
      symbol?: string;
      isIsolated?: boolean;
    },
  ): Promise<any[]> {
    return this.request({
      path: '/sapi/v1/margin/openOrders',
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

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
  async placeMarginOrder(
    apiKey: ExApiKey,
    params: CreateOrderParams,
  ): Promise<any> {
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
