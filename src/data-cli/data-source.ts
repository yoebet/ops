import { Observable } from 'rxjs';
import { groupBy } from 'lodash';
import { DataSourceOptions, WsBase } from './ws-base';
import {
  CompactAggRequestParams,
  DataRequestParams,
  KlineDataScope,
  OflowDataChannel as DataChannel,
  OflowDataType,
  OflowDataType as DataType,
  TickerDataScope,
} from './commands';
import {
  OFTimeLevel,
  OFExchange,
  OFExchangeSymbol,
  OFUnifiedSymbol,
  OFCoin,
} from './meta-types';
import { RtPriceSubs } from './rtprice-subs';
import { RtKline, RtPrice } from '@/data-service/models/realtime';
import { FtKline } from '@/data-service/models/klines';

export class DataSource extends WsBase {
  timeLevels?: OFTimeLevel[];

  exchanges?: OFExchange[];

  symbolsByCoin?: { [coin: string]: OFUnifiedSymbol[] };

  private serverTsDiff: number | undefined = undefined;

  readonly exNameMap = new Map<string, string>();

  readonly symbolsMap = new Map<string, OFUnifiedSymbol>();

  readonly coinsMap = new Map<string, OFCoin>();

  readonly rtPriceSubs: RtPriceSubs;

  constructor(protected options: DataSourceOptions) {
    super(options);

    this.rtPriceSubs = new RtPriceSubs(this);
    this.getConnectionSubject().subscribe((e) => {
      if (e.event === 'connect') {
        this.getServerTimeDiff(true).catch(console.error);
      }
    });
  }

  async getCoins(): Promise<OFCoin[]> {
    const ccs: OFCoin[] = await this.getMetadata('coins');
    for (const cc of ccs) {
      this.coinsMap.set(cc.coin, cc);
    }
    return ccs;
  }

  async getExchanges(forceReload?: boolean): Promise<OFExchange[]> {
    if (!forceReload && this.exchanges) {
      return this.exchanges;
    }
    const es: OFExchange[] = await this.getMetadata('exchanges');
    if (es) {
      this.exchanges = es;
      this.exNameMap.clear();
      for (const e of es) {
        this.exNameMap.set(e.exCode, e.name);
      }
    }
    return this.exchanges!;
  }

  async getUnifiedSymbols(): Promise<OFUnifiedSymbol[]> {
    const symbols: OFUnifiedSymbol[] = await this.getMetadata('symbols');
    for (const s of symbols) {
      this.symbolsMap.set(s.symbol, s);
    }
    this.symbolsByCoin = groupBy(symbols, 'base');
    return symbols;
  }

  async getExchangeSymbols(): Promise<OFExchangeSymbol[]> {
    return this.getMetadata('exSymbols');
  }

  async getTimeLevels(forceReload?: boolean): Promise<OFTimeLevel[]> {
    if (!forceReload && this.timeLevels) {
      return this.timeLevels;
    }
    const tls: OFTimeLevel[] = await this.getMetadata('intervals');
    if (tls) {
      this.timeLevels = tls;
    }
    return this.timeLevels!;
  }

  private async getServerTimeDiff(force?: boolean): Promise<number> {
    if (force || this.serverTsDiff == undefined) {
      const start = Date.now();
      const st = await this.getMetadata<number>('time');
      const end = Date.now();
      const reqSpan = end - start;
      if (reqSpan < 300) {
        this.serverTsDiff = +st[0] - (end - (reqSpan >> 1));
        // console.log(`server time diff: ${this.serverTsDiff}`);
      }
    }
    return this.serverTsDiff || 0;
  }

  getServerNow(): number {
    const diff = this.serverTsDiff || 0;
    return diff + Date.now();
  }

  async fetchKlines(params: DataRequestParams): Promise<FtKline[]> {
    return this.fetchData(DataType.kline, params);
  }

  async aggregateKlines(params: CompactAggRequestParams): Promise<any[]> {
    return this.fetchData(DataType.kline, params);
  }

  subscribeKline(dataScope: KlineDataScope): Observable<RtKline> {
    return this.subscribe(DataChannel.kline, dataScope);
  }

  subscribeTicker(dataScope: TickerDataScope): Observable<RtPrice> {
    return this.subscribe(DataChannel.ticker, dataScope);
  }

  async reSubscribeTicker(dataScope: TickerDataScope): Promise<void> {
    await this.reSubscribe(DataChannel.ticker, dataScope);
  }

  async getLatestPrice(
    dataScope: TickerDataScope,
  ): Promise<RtPrice | undefined> {
    const kls: RtPrice[] = await this.getLiveData(
      OflowDataType.ticker,
      dataScope,
    );
    if (!kls || kls.length === 0) {
      return undefined;
    }
    return kls[0];
  }

  async getLiveKline(dataScope: KlineDataScope): Promise<FtKline | undefined> {
    const kls: FtKline[] = await this.getLiveData(
      OflowDataType.kline,
      dataScope,
    );
    if (!kls || kls.length === 0) {
      return undefined;
    }
    return kls[0];
  }
}
