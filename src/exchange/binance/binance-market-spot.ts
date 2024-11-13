import { ExRestParams } from '@/exchange/base/rest/rest.type';
import { BinanceSpotRest } from '@/exchange/binance/rest-spot';
import {
  ExchangeMarketDataService,
  ExKline,
  ExPrice,
  FetchKlineParams,
} from '@/exchange/exchange-service-types';
import { BinanceBaseRest } from '@/exchange/binance/rest';
import { Candle, SymbolInfo } from '@/exchange/binance/types';
import { AppLogger } from '@/common/app-logger';

export class BinanceMarketSpot implements ExchangeMarketDataService {
  protected restSpot: BinanceSpotRest;
  protected readonly logger: AppLogger;

  constructor(protected params?: Partial<ExRestParams>) {
    this.restSpot = new BinanceSpotRest(params);
    this.logger = params.logger || AppLogger.build(this.constructor.name);
  }

  static toKline(raw: Candle): ExKline {
    const size = Number(raw[5]);
    const amount = Number(raw[7]);
    const bs = Number(raw[9]);
    const ba = Number(raw[10]);
    return {
      ts: Number(raw[0]),
      open: Number(raw[1]),
      high: Number(raw[2]),
      low: Number(raw[3]),
      close: Number(raw[4]),
      size,
      amount,
      bs,
      ba,
      ss: size - bs,
      sa: amount - ba,
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

    return resultRaw.map(BinanceMarketSpot.toKline);
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
}
