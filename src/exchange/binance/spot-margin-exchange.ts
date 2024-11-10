import { ExRestParams } from '@/exchange/base/rest/rest.type';
import { BinanceSpotRest } from '@/exchange/binance/rest-spot';
import {
  BaseExchange,
  ExKline,
  ExPrice,
  FetchKlineParams,
  PlaceOrderParams,
} from '@/exchange/rest-types';
import { BinanceBaseRest } from '@/exchange/binance/rest';
import {
  Candle,
  CreateOrderParams,
  SymbolInfo,
} from '@/exchange/binance/types';
import { ExApiKey } from '@/exchange/base/api-key';
import { BinanceMarginRest } from '@/exchange/binance/rest-margin';
import { ExAccountCode } from '@/db/models/exchange-types';

export class BinanceSpotMarginExchange extends BaseExchange {
  restMargin: BinanceMarginRest;
  restSpot: BinanceSpotRest;

  constructor(params?: Partial<ExRestParams>) {
    super({
      exAccount: ExAccountCode.binanceSpot,
      ...params,
    });
    this.restMargin = new BinanceMarginRest(params);
    this.restSpot = new BinanceSpotRest(params);
  }

  static toKline(raw: Candle): ExKline {
    return {
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
  }

  // https://binance-docs.github.io/apidocs/spot/cn/#k
  async getKlines(params: FetchKlineParams): Promise<ExKline[]> {
    const resultRaw: Candle[] = await this.restSpot.getKlines({
      symbol: params.symbol,
      interval: BinanceBaseRest.toCandleInv(params.interval),
      startTime: params.startTime,
      endTime: params.endTime,
      limit: params.limit,
    });
    if (!resultRaw) {
      return [];
    }

    return resultRaw.map(BinanceSpotMarginExchange.toKline);
  }

  async getSymbolInfo(symbol: string): Promise<SymbolInfo> {
    const res = await this.restSpot.getExchangeInfo({
      symbol,
      // symbols
      showPermissionSets: false,
    });
    return res['symbols'][0];
  }

  async getPrice(symbol: string): Promise<ExPrice> {
    const res: any = await this.restSpot.getPrice(symbol);
    return { last: +res.price };
  }

  // 现货/杠杆账户下单
  async placeOrder(apiKey: ExApiKey, params: PlaceOrderParams): Promise<any> {
    const op: CreateOrderParams = {
      symbol: params.symbol,
      newClientOrderId: params.clientOrderId,
      newOrderRespType: 'FULL',
      // price: params.price,
      // quantity: params.size,
      // quoteOrderQty: params.quoteAmount,
      side: params.side.toUpperCase() as any,
      // sideEffectType: undefined,
      // stopPrice: '',
      // icebergQty: '',
      // timeInForce: params.timeType?.toUpperCase() as any,
      type: params.type.toUpperCase() as any,
    };
    if (params.quoteAmount) {
      op.quoteOrderQty = params.quoteAmount;
    } else {
      op.quantity = params.size;
    }
    if (op.type.includes('LIMIT')) {
      op.price = params.price;
      if (!op.timeInForce) {
        op.timeInForce = 'GTC';
      }
    }
    this.logger.log(op);

    if (params.mode === 'cash') {
      const result = await this.restSpot.placeSpotOrder(apiKey, op);
      this.logger.log(result);
      return result;
    } else {
      op.isIsolated = params.mode === 'isolated';
      const result = await this.restMargin.placeMarginOrder(apiKey, op);
      this.logger.log(result);
      return result;
    }
  }
}
