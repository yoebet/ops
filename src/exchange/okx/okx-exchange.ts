import { Injectable } from '@nestjs/common';
import { OkxRest } from '@/exchange/okx/rest';
import {
  BaseExchange,
  ExKline,
  ExPrice,
  FetchKlineParams,
  PlaceOrderParams,
} from '@/exchange/rest-types';
import { ExRestParams } from '@/exchange/base/rest/rest.type';
import {
  CandleRawDataOkx,
  CreateOrderParams,
  RestTypes,
} from '@/exchange/okx/types';
import { ExApiKey } from '@/exchange/base/api-key';

@Injectable()
export class OkxExchange extends BaseExchange {
  rest: OkxRest;

  constructor(params?: Partial<ExRestParams>) {
    super();
    this.rest = new OkxRest(params);
  }

  static toCandleInv(inv: string): string {
    // [1s/1m/3m/5m/15m/30m/1H/2H/4H]
    // 香港时间开盘价k线：[6H/12H/1D/2D/3D/1W/1M/3M]
    // UTC时间开盘价k线：[6Hutc/12Hutc/1Dutc/2Dutc/3Dutc/1Wutc/1Mutc/3Mutc]
    const u = inv.charAt(inv.length - 1);
    if (u === 'o') {
      inv = inv.substring(0, inv.length - 1) + 'M';
    }
    if (!['s', 'm'].includes(u)) {
      inv = inv.toUpperCase();
    }
    if (['d', 'w', 'o'].includes(u)) {
      return inv + 'utc';
    }
    return inv;
  }

  static toKline(raw: CandleRawDataOkx): ExKline {
    return {
      ts: Number(raw[0]),
      open: Number(raw[1]),
      high: Number(raw[2]),
      low: Number(raw[3]),
      close: Number(raw[4]),
      size: Number(raw[6]),
      amount: Number(raw[7]),
      // bs: 0,
      // ba: 0,
      // ss: 0,
      // sa: 0,
      // tds: 0,
    };
  }

  // 获取交易产品K线数据 https://www.okx.com/docs-v5/zh/#order-book-trading-market-data-get-candlesticks
  async getKlines(params: FetchKlineParams): Promise<ExKline[]> {
    const candles: CandleRawDataOkx[] = await this.rest.getCandles({
      instId: params.symbol,
      bar: OkxExchange.toCandleInv(params.interval),
      before: params.startTime,
      after: params.endTime,
      limit: params.limit,
    });
    if (!candles) {
      return [];
    }
    return candles.map(OkxExchange.toKline);
  }

  async getSymbolInfo(symbol: string): Promise<any> {
    const res = await this.rest.getMarkets({
      instType: 'SPOT',
      instId: symbol,
    });
    return res[0];
  }

  async getPrice(symbol: string): Promise<ExPrice> {
    const tickers = await this.rest.getTicker({ instId: symbol });
    const t = tickers[0];
    return { last: +t.last };
  }

  async placeOrder(apiKey: ExApiKey, params: PlaceOrderParams): Promise<any> {
    let type: RestTypes['Order']['ordType'] = params.type;
    if (params.timeType) {
      if (params.timeType === 'gtc') {
        type = 'post_only';
      } else if (params.timeType === 'fok' || params.timeType === 'ioc') {
        type = params.timeType;
      }
    }
    const op: CreateOrderParams = {
      clOrdId: params.clientOrderId,
      instId: params.symbol,
      ordType: type,
      px: params.price,
      side: params.side,
      sz: params.size,
      tdMode: params.mode,
      posSide: params.posSide,
      ccy: params.mode === 'cross' ? params.ccy : undefined,
      // reduceOnly: false,
    };
    if (params.mode === 'cash' && type === 'market') {
      if (params.quoteAmount) {
        op.sz = params.quoteAmount;
        op.tgtCcy = 'quote_ccy';
      }
    }
    const result = await this.rest.createOrder(apiKey, op);
    return result;
  }
}
