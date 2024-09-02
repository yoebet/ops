import { ExRest } from '@/exchange/base/rest/ex-rest';
import {
  CandleRawDataOkx,
  RestBody,
  RestTypes,
  TradeRawDataOkx,
} from '@/exchange/okx/rest.types';
import {
  ExRestError,
  ExRestErrorType,
} from '@/exchange/base/errors/ex-rest.error';
import { includes } from 'lodash';
import {
  ExRestParams,
  Candle,
  ExRestReqBuildParams,
  ExRestReqConfig,
  ExRestRes,
  FetchCandleParam,
  FetchHistoryTradeParam,
  FetchTradeParam,
  HttpMethodType,
} from '@/exchange/base/rest/rest.type';
import {
  ExAccountCode,
  ExchangeCode,
  ExTrade,
} from '@/exchange/exchanges-types';
import { sortExTrade } from '@/exchange/base/base.type';
import { TradeSide } from '@/db/models-data/base';

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
    const { method, path, params, headers } = p;

    const reqHeaders = {
      'Content-Type': 'application/json; charset=UTF-8',
      // 默认的是 axios。okx 会把它当成是 ios 而过滤掉一些参数（例如 reduceOnly）
      'User-Agent': 'hxr',
      'accept-language': 'en-US', // accept-language: en-US,zh-CN
    };
    for (const key in headers) {
      reqHeaders[key] = headers[key];
    }

    let paramsStr: string | undefined, bodyStr: string | undefined;
    if (includes([HttpMethodType.get, HttpMethodType.delete], method)) {
      paramsStr = this.urlParamsStr(params, true);
    } else {
      bodyStr = this.jsonBody(params);
    }

    return {
      method: method,
      url: this.url(p) + (paramsStr ?? ''),
      headers: reqHeaders,
      data: bodyStr,
    };
  }

  protected async handleResErrs(res: ExRestRes) {
    const body = res.data as RestBody<any>;
    if (body.code === '0') return;

    // oauth access token过期处理，重新获取token后重试一次
    if (res.status === 400 && ['53000', '53002', '53012'].includes(body.code)) {
      throw ExRestError.fromResponse(
        body.msg,
        res,
        ExRestErrorType.invalidAccessToken,
      );
    }

    // {"code":"59107","data":[],"msg":"You have pending orders under the service, please modify the leverage after canceling all pending orders."}
    if (['59100', '59101', '59107'].includes(body.code)) {
      throw ExRestError.fromResponse(
        body.msg,
        res,
        ExRestErrorType.pendingOrderCannotChangeLeverageErr,
      );
    }

    // {"code":"59108","data":[],"msg":"Low leverage and insufficient margin, please adjust the leverage."}
    if (['59103', '59108', '59105', '59109'].includes(body.code)) {
      throw ExRestError.fromResponse(
        body.msg,
        res,
        ExRestErrorType.insufficientMarginBalanceCannotChangeLeverageErr,
      );
    }

    if (['59102', '59104', '59106'].includes(body.code)) {
      throw ExRestError.fromResponse(
        body.msg,
        res,
        ExRestErrorType.maximumAllowablePositionCannotChangeLeverageErr,
      );
    }

    if (
      res.status === 504 &&
      res.data.message &&
      /^The\s+upstream\s+server\s+is\s+timing\s+out.*$/.test(res.data.message)
    ) {
      throw ExRestError.fromResponse(
        res.data.message,
        res,
        ExRestErrorType.timeoutErr,
      );
    }

    // 接口请求超时（不代表请求成功或者失败，请检查请求结果）
    if (res.status === 400 && body.code === '50004') {
      throw ExRestError.fromResponse(body.msg, res, ExRestErrorType.timeoutErr);
    }

    if (
      res.status === 401 &&
      ['50105', '50111', '50113', '50114'].includes(body.code)
    ) {
      throw ExRestError.fromResponse(
        body.msg,
        res,
        ExRestErrorType.invalidApiKey,
      );
    }

    if (res.status === 200 && body.code === '51603') {
      throw ExRestError.fromResponse(
        body.msg,
        res,
        ExRestErrorType.orderNotExistErr,
      );
    }

    if (
      (res.status === 429 && body.code === '50013') ||
      ['50001', '50026'].includes(body.code)
    ) {
      throw ExRestError.fromResponse(
        body.msg,
        res,
        ExRestErrorType.exServiceTemporarilyUnavailableErr,
      );
    }

    if (res.status === 429 && body.code === '50011') {
      throw ExRestError.fromResponse(
        body.msg,
        res,
        ExRestErrorType.rateLimitErr,
      );
    }

    if (body.data && Array.isArray(body.data)) {
      const data = body.data as RestTypes['CodeAndMsg'][];
      let err = data.find((e) => e.sCode === '51008');
      if (err) {
        throw ExRestError.fromResponse(
          err.sMsg,
          res,
          ExRestErrorType.insufficientBalance,
        );
      }
      err = data.find((e) => e.sCode === '51202');
      if (err) {
        throw ExRestError.fromResponse(
          err.sMsg,
          res,
          ExRestErrorType.maximumOrderAmountErr,
        );
      }
      err = data.find((e) => e.sCode === '50021');
      if (err) {
        throw ExRestError.fromResponse(
          err.sMsg,
          res,
          ExRestErrorType.insufficientBalanceDueToLiquidationFrozen,
        );
      }

      err = data.find((e) => e.sCode === '51020');
      if (err) {
        throw ExRestError.fromResponse(
          err.sMsg,
          res,
          ExRestErrorType.minimumOrderSizeErr,
        );
      }

      err = data.find((e) => e.sCode === '51206');
      if (err) {
        throw ExRestError.fromResponse(
          err.sMsg,
          res,
          ExRestErrorType.needDoSomethingErr,
        );
      }

      err = data.find((e) => e.sCode === '50001');
      if (err) {
        throw ExRestError.fromResponse(
          err.sMsg,
          res,
          ExRestErrorType.exServiceTemporarilyUnavailableErr,
        );
      }

      err = data.find(
        (e) =>
          e.sCode === '51000' && /^Parameter\s+posSide\s+error.*$/.test(e.sMsg),
      );
      if (err) {
        throw ExRestError.fromResponse(
          err.sMsg,
          res,
          ExRestErrorType.posSideErr,
        );
      }

      // 参数错误
      err = data.find(
        (e) =>
          e.sCode === '50014' &&
          /^Parameter\s+px\s+can\s+not\s+be\s+empty.*$/.test(e.sMsg),
      );
      if (err) {
        throw ExRestError.fromResponse(err.sMsg, res, ExRestErrorType.priceErr);
      }
      // 可能是在现货交易的时候交易模式切换，导致交易所判断为杠杆，例如3转2，传递的是cross
      err = data.find(
        (e) =>
          e.sCode === '50014' &&
          /^Parameter\s+ccy\s+can\s+not\s+be\s+empty.*$/.test(e.sMsg),
      );
      if (err) {
        throw ExRestError.fromResponse(err.sMsg, res, ExRestErrorType.ccyErr);
      }
      // 可能是在现货交易的时候交易模式切换，导致交易所判断为杠杆，例如2转3，传递的是cash
      err = data.find(
        (e) =>
          (e.sCode === '51000' &&
            /^Parameter\s+tdMode\s+error.*$/.test(e.sMsg)) ||
          e.sCode === '51010',
      );
      if (err) {
        throw ExRestError.fromResponse(
          err.sMsg,
          res,
          ExRestErrorType.tdModeErr,
        );
      }
      // 可能是在现货交易的时候交易模式切换，1: tdMode: 'cross'
      err = data.find(
        (e) =>
          e.sCode === '51010' &&
          /^The\s+current\s+account\s+mode\s+does\s+not\s+support\s+this\s+API\s+interface.*$/.test(
            e.sMsg,
          ),
      );
      if (err) {
        throw ExRestError.fromResponse(
          err.sMsg,
          res,
          ExRestErrorType.accountModeErr,
        );
      }

      // 委托价格不在限价范围内
      err = data.find((e) => e.sCode === '51006');
      if (err) {
        throw ExRestError.fromResponse(
          err.sMsg,
          res,
          ExRestErrorType.orderPriceErr,
        );
      }

      const cancelErrs = data.filter((e) =>
        ['51400', '51401'].includes(e.sCode),
      );
      if (cancelErrs.length > 0) {
        throw ExRestError.fromResponse(
          cancelErrs[0].sMsg,
          res,
          ExRestErrorType.orderAlreadyCanceledErr,
        );
      }
      const alreadyClosedErrs = data.filter((e) => ['51402'].includes(e.sCode));
      if (alreadyClosedErrs.length > 0) {
        throw ExRestError.fromResponse(
          alreadyClosedErrs[0].sMsg,
          res,
          ExRestErrorType.orderAlreadyClosedErr,
        );
      }
    }
    throw ExRestError.fromResponse(body.msg, res);
  }

  protected toCandleInv(inv: string): string {
    // 如 [1m/3m/5m/15m/30m/1H/2H/4H]
    // 香港时间开盘价k线：[6H/12H/1D/2D/3D/1W/1M/3M]
    // UTC时间开盘价k线：[/6Hutc/12Hutc/1Dutc/2Dutc/3Dutc/1Wutc/1Mutc/3Mutc]
    return inv;
  }

  protected toFetchCandleParam(params: FetchCandleParam): Record<string, any> {
    return {
      instId: params.symbol,
      bar: this.toCandleInv(params.interval),
      after: params.startTime,
      before: params.endTime,
      limit: params.limit,
    };
  }

  protected toFetchTradeParam(params: FetchTradeParam): Record<string, any> {
    const para = {
      instId: params.symbol,
      limit: params?.limit || 500,
    };
    return para;
  }

  protected toFetchHistoryTradeParam(
    params: FetchHistoryTradeParam,
  ): Record<string, any> {
    let para: any = {
      instId: params.symbol,
      type: '1', //按tradeId
      limit: '100',
    };
    if (params.limit) {
      para = {
        ...para,
        limit: String(params.limit),
      };
    }
    if (params.fromId) {
      para.before = params.fromId;
    }
    if (params.toId) {
      para.after = params.toId;
    }

    return para;
  }

  protected toCandles(data: CandleRawDataOkx[]): Candle[] {
    if (!data) {
      return undefined;
    }
    const candles: Candle[] = [];
    for (const candleRawDataOkx of data) {
      const candle: Candle = {
        ts: Number(candleRawDataOkx[0]),
        open: Number(candleRawDataOkx[1]),
        high: Number(candleRawDataOkx[2]),
        low: Number(candleRawDataOkx[3]),
        close: Number(candleRawDataOkx[4]),
        size: Number(candleRawDataOkx[6]),
        amount: Number(candleRawDataOkx[7]),
        bs: 0,
        ba: 0,
        ss: 0,
        sa: 0,
        tds: 0,
      };
      candles.push(candle);
    }
    return candles;
  }

  protected _toTrades(data: TradeRawDataOkx[], symbol: string): ExTrade[] {
    if (!data) {
      return undefined;
    }
    const trades: ExTrade[] = [];
    for (const line of data) {
      const trade: ExTrade = {
        ex: ExchangeCode.okx,
        exAccount: this.exAccount,
        rawSymbol: symbol,
        tradeId: line.tradeId,
        price: +line.px,
        size: +line.sz,
        side: line.side == 'buy' ? TradeSide.buy : TradeSide.sell,
        ts: +line.ts,
      };
      trades.push(trade);
    }
    return trades.sort(sortExTrade);
  }

  // 获取交易产品K线数据 https://www.okx.com/docs-v5/zh/#rest-api-market-data-get-candlesticks
  async getCandlesticks(params: FetchCandleParam): Promise<Candle[]> {
    const fetchCandleParamOkx = this.toFetchCandleParam(params);
    const resultRaw: RestBody<CandleRawDataOkx[]> = await this.request({
      path: '/api/v5/market/candles',
      method: HttpMethodType.get,
      params: fetchCandleParamOkx,
    });
    return this.toCandles(resultRaw.data);
  }

  // https://www.okx.com/docs-v5/zh/#order-book-trading-market-data-get-trades
  async getTrades(params: FetchTradeParam): Promise<ExTrade[]> {
    const fetchTradeParam = this.toFetchTradeParam(params);
    const resultRaw: RestBody<TradeRawDataOkx[]> = await this.request({
      path: '/api/v5/market/trades',
      method: HttpMethodType.get,
      params: fetchTradeParam,
    });

    return this._toTrades(resultRaw.data, params.symbol);
  }

  async getHistoryTrades(params: FetchHistoryTradeParam): Promise<ExTrade[]> {
    const fetchTradeParam = this.toFetchHistoryTradeParam(params);
    const resultRaw: RestBody<TradeRawDataOkx[]> = await this.request({
      path: '/api/v5/market/history-trades',
      method: HttpMethodType.get,
      params: fetchTradeParam,
    });

    return this._toTrades(resultRaw.data, params.symbol);
  }
}
