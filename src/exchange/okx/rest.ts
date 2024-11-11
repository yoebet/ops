import { ExRest } from '@/exchange/base/rest/ex-rest';
import { includes } from 'lodash';
import {
  ExRestParams,
  ExRestReqBuildParams,
  ExRestReqConfig,
  ExRestRes,
  HttpMethodType,
} from '@/exchange/base/rest/rest.type';
import { enc, HmacSHA256 } from 'crypto-js';
import { ExAccountCode } from '@/db/models/exchange-types';
import {
  CandleRawDataOkx,
  CreateAlgoOrderParams,
  CreateOrderParams,
  GetDepositRecordsParams,
  GetWithdrawRecordsParams,
  InterestAccrued,
  RestBody,
  RestTypes,
  WithdrawalParams,
} from '@/exchange/okx/types';
import { ExApiKey } from '@/exchange/base/api-key';

/**
 * https://www.okx.com/docs-v5/zh/
 */
export class OkxRest extends ExRest {
  constructor(params?: Partial<ExRestParams>) {
    super({
      host: 'www.okx.com',
      exAccount: ExAccountCode.okxUnified,
      ...params,
    });
  }

  protected async buildReq(p: ExRestReqBuildParams): Promise<ExRestReqConfig> {
    const { method, path, params, apiKey } = p;

    const headers = {
      'Content-Type': 'application/json; charset=UTF-8',
      // 默认的是 axios。okx 会把它当成是 ios 而过滤掉一些参数（例如 reduceOnly）
      'User-Agent': 'hxr',
      'accept-language': 'en-US', // accept-language: en-US,zh-CN
    };

    let paramsStr: string | undefined, bodyStr: string | undefined;
    if (includes([HttpMethodType.get, HttpMethodType.delete], method)) {
      paramsStr = this.urlParamsStr(params, true);
    } else {
      bodyStr = this.jsonBody(params);
    }

    if (apiKey) {
      const ts = new Date().toISOString();
      headers['OK-ACCESS-TIMESTAMP'] = ts;
      headers['OK-ACCESS-KEY'] = apiKey.key;
      headers['OK-ACCESS-PASSPHRASE'] = apiKey.password!;

      const auth = ts + method + path + (paramsStr ?? '') + (bodyStr ?? '');
      headers['OK-ACCESS-SIGN'] = enc.Base64.stringify(
        HmacSHA256(auth, apiKey.secret),
      );
    }

    return {
      method,
      url: this.url(p) + (paramsStr ?? ''),
      headers,
      data: bodyStr,
    };
  }

  protected async handleResErrs(res: ExRestRes) {
    const body = res.data as RestBody<any>;
    if (body.code === '0') return;
    throw new Error(JSON.stringify(body));
  }

  async requestPickData<T>(p: ExRestReqBuildParams): Promise<T> {
    const res = await this.request<RestBody>(p);
    // {code, msg, data}
    return res.data;
  }

  // 获取市场信息 https://www.okx.com/docs-v5/zh/#rest-api-public-data-get-instruments
  async getMarkets(params: {
    instType: RestTypes['InstType'];
    uly?: string;
    instId?: string;
  }): Promise<RestTypes['Symbol'][]> {
    return this.requestPickData({
      path: '/api/v5/public/instruments',
      method: HttpMethodType.get,
      params,
    });
  }

  // 获取账户信息 https://www.okx.com/docs-v5/zh/#rest-api-account-get-account-configuration
  async getAccount(apiKey: ExApiKey): Promise<RestTypes['Account'][]> {
    return this.requestPickData({
      path: '/api/v5/account/config',
      method: HttpMethodType.get,
      apiKey,
    });
  }

  // 获取最大可买卖/开仓数量 https://www.okx.com/docs-v5/zh/#rest-api-account-get-maximum-buy-sell-amount-or-open-amount
  async getMaxOpenSize(
    apiKey: ExApiKey,
    params: {
      instId: string; // 支持多产品ID查询（不超过5个），半角逗号分隔
      tdMode: RestTypes['TradeMode'];
      ccy?: string; // 保证金币种，仅适用于单币种保证金模式下的全仓杠杆订单
      px?: string; // 委托价格
      leverage?: string; // 开仓杠杆倍数 默认为当前杠杆倍数 仅适用于币币杠杆/交割/永续
    },
  ): Promise<any[]> {
    return this.requestPickData({
      path: '/api/v5/account/max-size',
      method: HttpMethodType.get,
      params,
      apiKey,
    });
  }

  // 获取最大可用数量 https://www.okx.com/docs-v5/zh/#rest-api-account-get-maximum-available-tradable-amount
  async getMaxAvailableSize(
    apiKey: ExApiKey,
    params: {
      instId: string; // 支持多产品ID查询（不超过5个），半角逗号分隔
      tdMode: RestTypes['TradeMode'];
      ccy?: string; // 保证金币种，仅适用于单币种保证金模式下的全仓杠杆订单
      reduceOnly?: boolean; // 是否为只减仓模式，仅适用于币币杠杆
      px?: string; // 委托价格
    },
  ): Promise<RestTypes['MaxAvailableSize'][]> {
    return await this.requestPickData({
      path: '/api/v5/account/max-avail-size',
      method: HttpMethodType.get,
      params,
      apiKey,
    });
  }

  // 获取杠杆倍数 https://www.okx.com/docs-v5/zh/#rest-api-account-get-leverage
  async getLeverageInfo(
    apiKey: ExApiKey,
    params: {
      instId: string; // 支持多个instId查询，半角逗号分隔。instId个数不超过20个
      mgnMode: 'cross' | 'isolated';
    },
  ): Promise<RestTypes['LeverageInfo'][]> {
    return this.requestPickData({
      path: '/api/v5/account/leverage-info',
      method: HttpMethodType.get,
      params,
      apiKey,
    });
  }

  // 获取资金账户余额 https://www.okx.com/docs-v5/zh/#rest-api-funding-get-balance
  async getAssetBalances(
    apiKey: ExApiKey,
    params?: { ccy?: string },
  ): Promise<{ availBal: string; bal: string; ccy: string }[]> {
    return this.requestPickData({
      path: '/api/v5/asset/balances',
      method: HttpMethodType.get,
      params,
      apiKey,
    });
  }

  // 获取账户余额 https://www.okx.com/docs-v5/zh/#rest-api-account-get-balance
  async getBalances(
    apiKey: ExApiKey,
    params?: { ccy?: string },
  ): Promise<RestTypes['Balance'][]> {
    return this.requestPickData({
      path: '/api/v5/account/balance',
      method: HttpMethodType.get,
      params,
      apiKey,
    });
  }

  // 查看账户最大可转余额 https://www.okx.com/docs-v5/zh/#rest-api-account-get-maximum-withdrawals
  async getMaxWithdrawal(
    apiKey: ExApiKey,
    params?: { ccy?: string },
  ): Promise<RestTypes['Balance'][]> {
    return this.requestPickData({
      path: '/api/v5/account/max-withdrawal',
      method: HttpMethodType.get,
      params,
      apiKey,
    });
  }

  // 获取转账记录 https://www.okx.com/docs-v5/zh/#rest-api-account-get-bills-details-last-3-months
  async getArchivedBills(
    apiKey: ExApiKey,
    params?: {
      // 1：划转 2：交易 3：交割 4：自动换币 5：强平 6：保证金划转 7：扣息
      // 8：资金费 9：自动减仓 10：穿仓补偿 11：系统换币 12：策略划拨 13：对冲减仓
      type?: number;
      limit?: number; // 1-100
      before?: string;
    },
  ): Promise<RestTypes['Bill'][]> {
    return await this.requestPickData({
      path: '/api/v5/account/bills-archive',
      method: HttpMethodType.get,
      params,
      apiKey,
    });
  }

  // 获取仓位信息: https://www.okx.com/docs-v5/zh/#rest-api-account-get-positions
  async getPositions(
    apiKey: ExApiKey,
    params?: {
      instType: RestTypes['InstType'];
    },
  ): Promise<RestTypes['Position'][]> {
    return this.requestPickData({
      path: '/api/v5/account/positions',
      method: HttpMethodType.get,
      params,
      apiKey,
    });
  }

  // 获取价格 https://www.okx.com/docs-v5/zh/#rest-api-market-data-get-ticker
  async getTicker(params?: {
    instId?: string;
  }): Promise<RestTypes['Ticker'][]> {
    return this.requestPickData({
      path: '/api/v5/market/ticker',
      method: HttpMethodType.get,
      params,
    });
  }

  // 限速：40次/2s
  async getCandles(params: {
    instId: string;
    bar?: string;
    before?: string | number;
    after?: string | number;
    limit?: number; // 最大300，默认100
  }): Promise<CandleRawDataOkx[]> {
    return this.requestPickData({
      path: `/api/v5/market/candles`,
      method: HttpMethodType.get,
      params,
    });
  }

  // 获取指数价格K线 https://www.okx.com/docs-v5/zh/#rest-api-market-data-get-index-candlesticks
  async getIndexPriceCandles(params: {
    instId: string;
    bar?: string;
    limit?: number;
  }): Promise<RestTypes['Candle'][]> {
    // 指数价格组成 https://www.okx.com/docs-v5/zh/#rest-api-market-data-get-index-components
    return this.requestPickData({
      path: `/api/v5/market/index-candles`,
      method: HttpMethodType.get,
      params,
    });
  }

  // 获取交易产品K线数据 https://www.okx.com/docs-v5/zh/#order-book-trading-market-data-get-candlesticks
  // latest 1440

  // 获取当前账户交易手续费费率 https://www.okx.com/docs-v5/zh/#rest-api-account-get-fee-rates
  async getFeeRate(
    apiKey: ExApiKey,
    params: {
      instType: RestTypes['InstType'];
      // instId，uly，category必须且只允许传其中一个参数
      instId?: string;
      uly?: string;
      category?: '1' | '2' | '3' | '4'; // 币种手续费类别
    },
  ): Promise<RestTypes['FeeRate'][]> {
    return this.requestPickData({
      path: '/api/v5/account/trade-fee',
      method: HttpMethodType.get,
      params,
      apiKey,
    });
  }

  // 订单固定在数组第一个元素上
  async getOrder(
    apiKey: ExApiKey,
    params: {
      instId: string;
      ordId: string;
    },
  ): Promise<RestTypes['Order'][]> {
    return this.requestPickData({
      path: '/api/v5/trade/order',
      method: HttpMethodType.get,
      params,
      apiKey,
    });
  }

  // 获取用户未完成委托记录 https://www.okx.com/docs-v5/zh/#rest-api-trade-get-order-history-last-7-days
  async getOpenOrders(
    apiKey: ExApiKey,
    params: {
      instType?: RestTypes['InstType'];
      instId?: string;
      ordType?: RestTypes['OrderType'];
      state?: 'live' | 'partially_filled';
      before?: string;
      limit?: number;
    },
  ): Promise<RestTypes['Order'][]> {
    return this.requestPickData({
      path: '/api/v5/trade/orders-pending',
      method: HttpMethodType.get,
      params,
      apiKey,
    });
  }

  // 获取用户已完成委托记录（近七天）
  // https://www.okx.com/docs-v5/zh/#rest-api-trade-get-order-history-last-7-days
  async getClosedOrders(
    apiKey: ExApiKey,
    params: {
      instType: RestTypes['InstType'];
      instId?: string;
      before?: string;
      begin?: string | number;
      end?: string | number;
      limit?: number;
    },
  ): Promise<RestTypes['Order'][]> {
    return this.requestPickData({
      path: '/api/v5/trade/orders-history',
      method: HttpMethodType.get,
      params,
      apiKey,
    });
  }

  // 下单 https://www.okx.com/docs-v5/zh/#rest-api-trade-place-order
  async createOrder(
    apiKey: ExApiKey,
    params: CreateOrderParams,
  ): Promise<RestTypes['CreateOrder'][]> {
    return this.requestPickData({
      path: '/api/v5/trade/order',
      method: HttpMethodType.post,
      params,
      apiKey,
    });
  }

  // 策略委托下单 https://www.okx.com/docs-v5/zh/#order-book-trading-algo-trading-post-place-algo-order
  async createAlgoOrder(
    apiKey: ExApiKey,
    params: CreateAlgoOrderParams,
  ): Promise<RestTypes['CreateOrder'][]> {
    return this.requestPickData({
      path: '/api/v5/trade/order-algo',
      method: HttpMethodType.post,
      params,
      apiKey,
    });
  }

  // https://www.okx.com/docs-v5/zh/#rest-api-trade-cancel-order
  async cancelOrder(
    apiKey: ExApiKey,
    params: {
      instId: string;
      ordId: string;
    },
  ): Promise<RestTypes['CancelOrder'][]> {
    return this.requestPickData({
      path: '/api/v5/trade/cancel-order',
      method: HttpMethodType.post,
      params,
      apiKey,
    });
  }

  // https://www.okx.com/docs-v5/zh/#order-book-trading-trade-post-cancel-multiple-orders
  async cancelBatchOrders(
    apiKey: ExApiKey,
    params: {
      instId: string;
      ordId: string;
    }[],
  ): Promise<RestTypes['CancelOrder'][]> {
    return this.requestPickData({
      path: '/api/v5/trade/cancel-batch-orders',
      method: HttpMethodType.post,
      params,
      apiKey,
    });
  }

  async getInterestRate(
    apiKey: ExApiKey,
    params: {
      ccy?: string;
    },
  ): Promise<{ ccy: string; interestRate: string }[]> {
    return this.requestPickData({
      path: '/api/v5/account/interest-rate',
      method: HttpMethodType.get,
      params,
      apiKey,
    });
  }

  async getInterestLimits(
    apiKey: ExApiKey,
    params: {
      ccy?: string;
    },
  ): Promise<any> {
    return this.requestPickData({
      path: '/api/v5/account/interest-limits',
      method: HttpMethodType.get,
      params,
      apiKey,
    });
  }

  async getMarginInterestAccrued(
    apiKey: ExApiKey,
    params: {
      // type: '1' | '2'; // 借币类型 1：尊享借币 2：市场借币 默认为市场借币
      ccy?: string;
      instId?: string;
      mgnMode?: 'cross' | 'isolated';
      after?: number; // 请求此时间戳之前（更旧的数据）的分页内容，Unix时间戳的毫秒数格式，如 1597026383085
      before?: number; // 请求此时间戳之后（更新的数据）的分页内容，Unix时间戳的毫秒数格式，如 1597026383085
      limit?: number; // 分页返回的结果集数量，最大为100，不填默认返回100条
    },
  ): Promise<InterestAccrued[]> {
    return this.requestPickData({
      path: '/api/v5/account/interest-accrued',
      method: HttpMethodType.get,
      params,
      apiKey,
    });
  }

  // 获取充值地址信息
  async getDepositAddress(
    apiKey: ExApiKey,
    params: {
      ccy: string;
    },
  ): Promise<RestTypes['DepositAddress'][]> {
    return this.requestPickData({
      path: `/api/v5/asset/deposit-address?ccy=${params.ccy}`,
      method: HttpMethodType.get,
      apiKey,
    });
  }

  // 获取充值记录
  async getDepositRecords(
    apiKey: ExApiKey,
    params: GetDepositRecordsParams,
  ): Promise<RestTypes['DepositRecord'][]> {
    return this.requestPickData({
      path: `/api/v5/asset/deposit-history`,
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 获取币种列表
  async getAssetCurrencies(
    apiKey: ExApiKey,
  ): Promise<RestTypes['AssetCurrency'][]> {
    return this.requestPickData({
      path: `/api/v5/asset/currencies`,
      method: HttpMethodType.get,
      apiKey,
    });
  }

  // 提币
  async submitWithdrawal(
    apiKey: ExApiKey,
    params: WithdrawalParams,
  ): Promise<
    {
      ccy: string; // 币种
      amt: string; // 数量
      chain?: string; // 币种链信息
      wdId: string; // 提币申请ID
      clientId: string; // 客户自定义ID
    }[]
  > {
    return this.requestPickData({
      path: `/api/v5/asset/withdrawal`,
      method: HttpMethodType.post,
      apiKey,
      params,
    });
  }

  // 获取提币记录
  async getWithdrawRecords(
    apiKey: ExApiKey,
    params: GetWithdrawRecordsParams,
  ): Promise<RestBody<RestTypes['WithdrawRecord'][]>> {
    return this.requestPickData({
      path: `/api/v5/asset/withdrawal-history`,
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 资金划转
  async assetTransfer(
    apiKey: ExApiKey,
    params: {
      ccy: string; // 币种，如 USDT
      amt: string; // 划转数量
      from: string; // 转出账户 6：资金账户 18：交易账户
      to: string; // 转入账户 6：资金账户 18：交易账户
      subAcct?: string; // 子账户名称，type为 1或 2：subAcct为必填项
      // 0：账户内划转
      // 1：母账户转子账户(仅适用于母账户APIKey)
      // 2：子账户转母账户(仅适用于母账户APIKey)
      // 3：子账户转母账户(仅适用于子账户APIKey)
      // 4：子账户转子账户(仅适用于子账户APIKey，且目标账户需要是同一母账户下的其他子账户)
      type?: string;
      loanTrans?: boolean; // 是否支持跨币种保证金模式或组合保证金模式下的借币转入/转出
      clientId?: string; // 客户自定义ID 字母（区分大小写）与数字的组合，可以是纯字母、纯数字且长度要在1-32位之间。
    },
  ): Promise<RestTypes['TransferResult'][]> {
    return this.requestPickData({
      path: `/api/v5/asset/transfer`,
      method: HttpMethodType.post,
      apiKey,
      params,
    });
  }

  // 获取资金划转记录
  async getAssetTransferState(
    apiKey: ExApiKey,
    params: {
      transId?: string; // 划转ID. transId和clientId必须传一个，若传两个，以transId为主
      clientId?: string; // 客户自定义ID
      type?: string; // 0：账户内划转 1：母账户转子账户 2：子账户转母账户 默认为 0。
    },
  ): Promise<RestTypes['TransferState'][]> {
    return this.requestPickData({
      path: `/api/v5/asset/transfer-state`,
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 获取子账户列表
  async getSubAccounts(
    apiKey: ExApiKey,
    params?: {
      enable?: boolean;
      subAcct?: string; // 子账户名称
    },
  ): Promise<RestTypes['SubAccount'][]> {
    return this.requestPickData({
      path: `/api/v5/users/subaccount/list`,
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }

  // 获取子账户资产余额 https://www.okx.com/docs-v5/zh/#rest-api-subaccount-get-sub-account-balance
  async getSubAccountBalances(
    apiKey: ExApiKey,
    params: { subAcct: string },
  ): Promise<RestTypes['Balance'][]> {
    return this.requestPickData({
      path: '/api/v5/account/subaccount/balances',
      method: HttpMethodType.get,
      apiKey,
      params,
    });
  }
}
