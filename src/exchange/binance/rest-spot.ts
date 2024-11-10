import { BinanceBaseRest } from '@/exchange/binance/rest';
import { ExRestParams, HttpMethodType } from '@/exchange/base/rest/rest.type';
import { ExAccountCode } from '@/db/models/exchange-types';
import { ExApiKey } from '@/exchange/base/api-key';
import {
  AssetTransferRecord,
  Candle,
  CreateOrderParams,
  DepositAddress,
  DepositRecord,
  DWRecordsParamsBase,
  ExchangeInfo,
  MainSubTransferParams,
  SubAccount,
  WithdrawRecord,
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
  async getExchangeInfo(params: {
    symbol?: string;
    symbols?: string[];
    showPermissionSets?: boolean;
  }): Promise<ExchangeInfo> {
    const symbols = params.symbols;
    return this.request({
      path: '/api/v3/exchangeInfo',
      method: HttpMethodType.get,
      params: {
        ...params,
        symbols: symbols ? JSON.stringify(symbols) : undefined,
      },
    });
  }

  async getKlines(params: {
    symbol: string;
    interval: string;
    startTime?: number;
    endTime?: number;
    limit: number;
  }): Promise<Candle[]> {
    return this.request({
      path: '/api/v3/klines',
      method: HttpMethodType.get,
      params,
    });
  }

  async getPrice(symbol: string): Promise<{ symbol: string; price: string }> {
    return this.request({
      path: '/api/v3/ticker/price',
      method: HttpMethodType.get,
      params: { symbol },
    });
  }

  async getPrices(
    symbols: string[],
  ): Promise<{ symbol: string; price: string }[]> {
    return this.request({
      path: '/api/v3/ticker/price',
      method: HttpMethodType.get,
      params: { symbols: JSON.stringify(symbols) },
    });
  }

  // 现货账户下单
  async placeSpotOrder(
    apiKey: ExApiKey,
    params: CreateOrderParams,
  ): Promise<any> {
    return this.request({
      path: '/api/v3/order',
      method: HttpMethodType.post,
      apiKey,
      params,
    });
  }

  // 撤销订单
  async cancelOrder(
    apiKey: ExApiKey,
    params: {
      symbol: string;
      orderId: string;
    },
  ): Promise<any> {
    return this.request({
      path: '/api/v3/order',
      method: HttpMethodType.delete,
      apiKey,
      params,
    });
  }

  // 撤销单一交易对的所有挂单
  async cancelOpenOrders(
    apiKey: ExApiKey,
    params: {
      symbol: string;
    },
  ): Promise<any> {
    return this.request({
      path: '/api/v1/openOrders',
      method: HttpMethodType.delete,
      apiKey,
      params,
    });
  }
}
