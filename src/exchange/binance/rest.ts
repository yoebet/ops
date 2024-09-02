import { ExRest } from '@/exchange/base/rest/ex-rest';
import {
  ExRestError,
  ExRestErrorType,
} from '@/exchange/base/errors/ex-rest.error';
import {
  Candle,
  ExRestReqBuildParams,
  ExRestReqConfig,
  ExRestRes,
  FetchCandleParam,
  FetchHistoryTradeParam,
  FetchTradeParam,
} from '@/exchange/base/rest/rest.type';
import {
  CandleRawDataBinance,
  TradeRawDataBinance,
} from '@/exchange/binance/rest.type';
import { ExchangeCode, ExTrade } from '@/exchange/exchanges-types';
import { sortExTrade } from '@/exchange/base/base.type';
import { TradeSide } from '@/db/models-data/base';

export abstract class BinanceBaseRest extends ExRest {
  protected async buildReq(p: ExRestReqBuildParams): Promise<ExRestReqConfig> {
    const { method, params, headers } = p;

    const paramsStr = this.urlParamsStr({
      ...params,
    });

    const url = this.url(p) + '?' + paramsStr;
    const reqHeaders = {
      'Content-Type': 'application/json; charset=UTF-8',
    };
    // if (this.api_key) {
    //   reqHeaders['X-MBX-APIKEY'] = this.api_key;
    // }
    for (const key in headers) {
      reqHeaders[key] = headers[key];
    }

    return {
      method: method,
      url: url,
      headers: reqHeaders,
    };
  }

  protected async handleResErrs(res: ExRestRes): Promise<void> {
    if (res.status === 503) {
      throw ExRestError.fromResponse(
        res.data.msg,
        res,
        ExRestErrorType.exServiceTemporarilyUnavailableErr,
      );
    }
    if (res.status === 401) {
      if ([-2014, -2015].includes(res.data.code)) {
        throw ExRestError.fromResponse(
          res.data.msg,
          res,
          ExRestErrorType.invalidApiKey,
        );
      }
    }
    if (res.status === 400) {
      if ([-1022].includes(res.data.code)) {
        throw ExRestError.fromResponse(
          res.data.msg,
          res,
          ExRestErrorType.invalidApiKey,
        );
      }
    }
    if ([-4161].includes(res.data.code)) {
      throw ExRestError.fromResponse(
        res.data.msg,
        res,
        ExRestErrorType.pendingOrderUnderIsolatedCannotChangeLowLeverageErr,
      );
    }
    if ([-4047, -4048].includes(res.data.code)) {
      throw ExRestError.fromResponse(
        res.data.msg,
        res,
        ExRestErrorType.pendingOrderCannotChangeMarginModeErr,
      );
    }
    if ([-4168].includes(res.data.code)) {
      throw ExRestError.fromResponse(
        res.data.msg,
        res,
        ExRestErrorType.multiAssetsModeCannotChangeMarginModeErr,
      );
    }
    if ([-2027].includes(res.data.code)) {
      throw ExRestError.fromResponse(
        res.data.msg,
        res,
        ExRestErrorType.maximumAllowablePositionCannotChangeLeverageErr,
      );
    }
    if ([-2028].includes(res.data.code)) {
      throw ExRestError.fromResponse(
        res.data.msg,
        res,
        ExRestErrorType.insufficientMarginBalanceCannotChangeLeverageErr,
      );
    }
    if ([-1003].includes(res.data.code)) {
      throw ExRestError.fromResponse(
        res.data.msg,
        res,
        ExRestErrorType.rateLimitErr,
      );
    }
    if ([-2018, -2019].includes(res.data.code)) {
      throw ExRestError.fromResponse(
        res.data.msg,
        res,
        ExRestErrorType.insufficientBalance,
      );
    }
    if ([-1111].includes(res.data.code)) {
      throw ExRestError.fromResponse(
        res.data.msg,
        res,
        ExRestErrorType.minimumOrderSizeErr,
      );
    }
    if ([-4164].includes(res.data.code)) {
      throw ExRestError.fromResponse(
        res.data.msg,
        res,
        ExRestErrorType.minimumOrderNotionalErr,
      );
    }
    if ([-4013].includes(res.data.code)) {
      throw ExRestError.fromResponse(
        res.data.msg,
        res,
        ExRestErrorType.minimumOrderPriceErr,
      );
    }
    if ([-4141, -1121].includes(res.data.code)) {
      throw ExRestError.fromResponse(
        res.data.msg,
        res,
        ExRestErrorType.symbolTakeDownErr,
      );
    }
    if ([-2013].includes(res.data.code)) {
      throw ExRestError.fromResponse(
        res.data.msg,
        res,
        ExRestErrorType.orderNotExistErr,
      );
    }
    if ([-4061].includes(res.data.code)) {
      throw ExRestError.fromResponse(
        res.data.msg,
        res,
        ExRestErrorType.posSideErr,
      );
    }
    // -2011: 取消订单被拒绝,要么订单不是你的，要么已经取消了
    if ([-2011].includes(res.data.code)) {
      throw ExRestError.fromResponse(
        res.data.msg,
        res,
        ExRestErrorType.orderAlreadyCanceledErr,
      );
    }
    if ([-1021].includes(res.data.code)) {
      throw ExRestError.fromResponse(
        res.data.msg,
        res,
        ExRestErrorType.timestampErr,
      );
    }
    if ([-4059, -4046].includes(res.data.code)) {
      throw ExRestError.fromResponse(
        res.data.msg,
        res,
        ExRestErrorType.noNeedErr,
      );
    }
    if ([-4067].includes(res.data.code)) {
      throw ExRestError.fromResponse(
        res.data.msg,
        res,
        ExRestErrorType.pendingOrderCannotChangePosSideErr,
      );
    }
    if ([-4068].includes(res.data.code)) {
      throw ExRestError.fromResponse(
        res.data.msg,
        res,
        ExRestErrorType.existsPositionCannotChangePosSideErr,
      );
    }
    if (res.status !== 200) {
      if (res.data.code) {
        throw ExRestError.fromResponse(
          `${res.data.code}: ${res.data.msg ?? 'Unknown error'}`,
          res,
        );
      }
      await super.handleResErrs(res);
    }
  }

  protected toCandleInv(inv: string): string {
    return inv === '1m' ? '1m' : undefined;
  }

  protected toFetchCandleParam(params: FetchCandleParam): Record<string, any> {
    return {
      symbol: params.symbol,
      interval: this.toCandleInv(params.interval),
      startTime: params.startTime,
      endTime: params.endTime,
      limit: params.limit,
    };
  }

  protected toFetchTradeParam(params: FetchTradeParam): Record<string, any> {
    const para = {
      symbol: params.symbol,
      limit: params.limit ? params.limit : 1000,
    };
    return para; //返回最新数据
  }

  protected toFetchHistoryTradeParam(
    params: FetchHistoryTradeParam,
  ): Record<string, any> {
    const para = {
      symbol: params.symbol,
      limit: params.limit ? params.limit : 1000,
    };
    if (params.fromId && +params.fromId > 0) {
      return {
        ...para,
        fromId: Number(params.fromId) + 1,
      };
    } else {
      return para; //返回最新数据
    }
  }

  protected toCandles(data: CandleRawDataBinance[]): Candle[] {
    if (!data) {
      return undefined;
    }
    const candles: Candle[] = [];
    for (const raw of data) {
      const candle: Candle = {
        ts: Number(raw[0]),
        open: Number(raw[1]),
        high: Number(raw[2]),
        low: Number(raw[3]),
        close: Number(raw[4]),
        size: Number(raw[5]),
        amount: Number(raw[7]),
        bs: Number(raw[9]),
        ba: Number(raw[10]),
        ss: Number(raw[5]) - Number(raw[9]),
        sa: Number(raw[7]) - Number(raw[10]),
        tds: Number(raw[8]),
      };
      candles.push(candle);
    }
    return candles;
  }

  protected toTrades(data: TradeRawDataBinance[], symbol: string): ExTrade[] {
    if (!data) {
      return undefined;
    }
    const trades: ExTrade[] = [];
    for (const line of data) {
      const trade: ExTrade = {
        ex: ExchangeCode.binance,
        exAccount: this.exAccount,
        rawSymbol: symbol,
        tradeId: String(line.id),
        price: +line.price,
        size: +line.qty,
        amount: +line.quoteQty,
        side: line.isBuyerMaker ? TradeSide.buy : TradeSide.sell,
        ts: +line.time,
      };
      trades.push(trade);
    }
    return trades.sort(sortExTrade);
  }
}
