import { ExError } from '@/exchange/base/errors/ex.error';
import { ExRestRes } from '@/exchange/base/rest/rest.type';

// 错误类型
export enum ExRestErrorType {
  networkErr = 'networkErr', // 网络错误
  timeoutErr = 'timeoutErr', // 请求超时错误
  invalidApiKey = 'invalidApiKey', // 无效的 api key
  invalidAccessToken = 'invalidAccessToken', // 无效的 access token
  insufficientBalance = 'insufficientBalance', // 余额不足
  insufficientBalanceDueToLiquidationFrozen = 'insufficientBalanceDueToLiquidationFrozen', // {0}币种处于强平冻结中，无法进行相关操作
  posSideErr = 'posSideErr', // 持仓设置错误,目前仅仅支持单项持仓
  pendingOrderCannotChangePosSideErr = 'pendingOrderCannotChangePosSideErr',
  existsPositionCannotChangePosSideErr = 'existsPositionCannotChangePosSideErr',
  priceErr = 'priceErr', // 价格参数有误
  orderPriceErr = 'orderPriceErr', // 委托价格不在限价范围内
  ccyErr = 'ccyErr', // 保证金币种参数有误,仅适用于单币种保证金模式下的全仓杠杆订单
  tdModeErr = 'tdModeErr', // 交易模式参数有误
  accountModeErr = 'accountModeErr',
  rateLimitErr = 'rateLimitErr', // 请求数限制,ftx 1500/min,okx 用户请求频率过快，超过该接口允许的限额
  orderAlreadyCanceledErr = 'orderAlreadyCanceledErr', // 订单已取消
  orderAlreadyClosedErr = 'orderAlreadyClosedErr', // 订单已完成，无法取消
  orderNotExistErr = 'orderNotExistErr', // 订单不存在
  minimumOrderSizeErr = 'minimumOrderSizeErr', // 订单委托数量不足单笔下限
  minimumOrderPriceErr = 'minimumOrderPriceErr', // 订单委托价格不足单笔下限
  minimumOrderNotionalErr = 'minimumOrderNotionalErr', // 订单委托额不足单笔下限, binance only
  maximumOrderAmountErr = 'maximumOrderAmountErr', // 市价单下单数量超出最大值
  exServiceTemporarilyUnavailableErr = 'exServiceTemporarilyUnavailableErr', // 交易所服务不可用，例如okx维护期间返回该错误
  timestampErr = 'timestampErr', // receive window/timestamp错误
  noNeedErr = 'noNeedErr', // 无需操作
  unsupportedCandleResolutionErr = 'unsupportedCandleResolutionErr', // 不支持的k线周期
  pendingOrderCannotChangeLeverageErr = 'pendingOrderCannotChangeLeverageErr',
  insufficientMarginBalanceCannotChangeLeverageErr = 'insufficientMarginBalanceCannotChangeLeverageErr',
  maximumAllowablePositionCannotChangeLeverageErr = 'maximumAllowablePositionCannotChangeLeverageErr',
  pendingOrderUnderIsolatedCannotChangeLowLeverageErr = 'pendingOrderUnderIsolatedCannotChangeLowLeverageErr', // 逐仓仓位模式下无法降低杠杆
  pendingOrderCannotChangeMarginModeErr = 'pendingOrderCannotChangeMarginModeErr',
  multiAssetsModeCannotChangeMarginModeErr = 'multiAssetsModeCannotChangeMarginModeErr',
  needDoSomethingErr = 'needDoSomethingErr', // ftx: Until you complete the Tokenized Stocks questionnaire you can only close your positions in this product
  symbolTakeDownErr = 'symbolTakeDownErr', // 交易对已下架
}

/**
 * 调用交易所 Rest 接口时返回的错误
 */
export class ExRestError extends ExError {
  readonly ___type = 'ExRestError';

  static isRestError(err: any): err is ExRestError {
    return '___type' in err && (err as ExRestError).___type === 'ExRestError';
  }

  constructor(
    message?: string,
    details?:
      | {
          errType?: ExRestErrorType;
          errMsg?: string; // 原始错误
          url?: string;
          httpCode?: number; // http 响应中的状态码
          response?: any;
        }
      | Record<string, any>,
  ) {
    super(message, details);
  }

  static fromResponse(
    message?: string,
    response?: ExRestRes,
    errType?: ExRestErrorType,
  ) {
    return new ExRestError(message, {
      errType,
      url: response?.config.url,
      httpCode: response?.status,
      response: response?.data,
      errMsg: message,
    });
  }
}
