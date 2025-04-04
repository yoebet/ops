import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import * as Rx from 'rxjs';
import { Observable, Subject } from 'rxjs';
import { AppLogger } from '@/common/app-logger';
import { ExSymbolService } from '@/common-services/ex-symbol.service';
import { ConfigService } from '@nestjs/config';
import { ExchangeCode, ExMarket } from '@/db/models/exchange-types';
import { DataChannelService } from '@/data-service/data-channel.service';
import { TickerHandler } from '@/data-ex/ticker-handler';
import { KlineHandler } from '@/data-ex/kline-handler';
import { SymbolParamSubject } from '@/exchange/base/ws/ex-ws-subjects';
import { RtKline, RtPrice } from '@/data-service/models/realtime';
import {
  ExchangeMarketDataWs,
  ExTrade,
  ExWsKline,
} from '@/exchange/exchange-service.types';
import { Exchanges } from '@/exchange/exchanges';
import { wait } from '@/common/utils/utils';

interface ExMarketWs {
  ex: ExchangeCode;
  market: ExMarket;
  ws: ExchangeMarketDataWs;
  tradeSubject?: SymbolParamSubject<ExTrade>;
  // tradeObs?: Observable<Trade>;
  klineSubjects: {
    [interval: string]: SymbolParamSubject<ExWsKline>;
  };
}

export interface WatchRtPriceParams {
  lowerBound: number;
  upperBound: number;
  timeoutSeconds?: number;
}

export interface WatchRtPriceResult {
  price: number;
  timeout?: boolean;
  reachLower?: boolean;
  reachUpper?: boolean;
}

export interface RtPriceTap {
  (trade: RtPrice): Promise<void>;
}

@Injectable()
export class ExPublicWsService implements OnApplicationShutdown {
  private runningWs = new Map<string, ExMarketWs>();
  private clientId = 0;
  private rtPriceObs: {
    // ex-symbol
    [key: string]: { obs: Subject<RtPrice>; clients: Set<number> };
  } = {};
  private rtKlineObs: {
    // ex-symbol-interval
    [key: string]: { obs: Subject<RtKline>; clients: Set<number> };
  } = {};
  private rtPriceTaps: [string, RtPriceTap][] = [];

  private tickerHandler: TickerHandler;
  private klineHandler: KlineHandler;

  constructor(
    readonly configService: ConfigService,
    readonly symbolService: ExSymbolService,
    readonly exchangeServices: Exchanges,
    readonly dataChannelService: DataChannelService,
    readonly logger: AppLogger,
  ) {
    logger.setContext('ex-public-ws-service');
    this.tickerHandler = new TickerHandler(
      symbolService,
      dataChannelService,
      false,
      logger.newLogger('ticker-handler'),
    );
    this.klineHandler = new KlineHandler(
      symbolService,
      dataChannelService,
      false,
      logger.newLogger('kline-handler'),
    );
  }

  async start() {
    this.logger.log(`:::: start ...`);
    const exs: ExchangeCode[] = [ExchangeCode.okx, ExchangeCode.binance];
    const coins = ['ETH', 'DOGE', 'FIL', 'XRP', 'SOL'];
    for (const ex of exs) {
      for (const coin of coins) {
        const symbol = `${coin}/USDT`;
        await this.subscribeRtPrice(ex, symbol);
      }
    }
  }

  addRtPriceTap(key: string, tap: RtPriceTap) {
    const kt = this.rtPriceTaps.find(([k, t]) => k === key);
    if (kt) {
      kt[1] = tap;
      return;
    }
    this.rtPriceTaps.push([key, tap]);
  }

  removeRtPriceTap(key: string) {
    const idx = this.rtPriceTaps.findIndex(([k, t]) => k === key);
    if (idx) {
      this.rtPriceTaps.splice(idx, 1);
    }
  }

  private getExMarketWs(ex: ExchangeCode, market: ExMarket): ExMarketWs {
    const key = `${ex}:${market}`;
    let exMarketWs = this.runningWs.get(key);
    if (exMarketWs) {
      return exMarketWs;
    }
    const ws = this.exchangeServices.getExMarketDataWs(ex, market);
    exMarketWs = {
      ex,
      market,
      ws,
      klineSubjects: {},
    };
    this.runningWs.set(key, exMarketWs);
    return exMarketWs;
  }

  private setupRtPriceReceiver(exAccountWs: ExMarketWs) {
    let tradeSubject = exAccountWs.tradeSubject;
    if (tradeSubject) {
      return;
    }
    tradeSubject = exAccountWs.ws.tradeSubject();
    exAccountWs.tradeSubject = tradeSubject;
    this.tickerHandler.receiveWsTickers(tradeSubject).subscribe((trade) => {
      const key = `${trade.ex}-${trade.symbol}`;
      let symbolObs = this.rtPriceObs[key];
      if (!symbolObs) {
        symbolObs = {
          obs: new Subject<RtPrice>(),
          clients: new Set<number>(),
        };
        this.rtPriceObs[key] = symbolObs;
      }
      symbolObs.obs.next(trade);
      for (const [key, tt] of this.rtPriceTaps) {
        tt(trade).catch((e) => this.logger.error(e, `rtPrice-tap:${key}`));
      }
    });
  }

  async subscribeRtPrice(
    ex: ExchangeCode,
    symbol: string,
  ): Promise<{ obs: Observable<RtPrice>; unsubs: () => void }> {
    await this.symbolService.ensureLoaded();
    const exchangeSymbol = this.symbolService.getExchangeSymbolByES(ex, symbol);
    const rawSymbol = exchangeSymbol.rawSymbol;
    const exAccountWs = this.getExMarketWs(ex, exchangeSymbol.market);

    this.setupRtPriceReceiver(exAccountWs);

    const key = `${ex}-${symbol}`;
    let symbolObs = this.rtPriceObs[key];
    if (!symbolObs) {
      symbolObs = {
        obs: new Subject<RtPrice>(),
        clients: new Set<number>(),
      };
      this.rtPriceObs[key] = symbolObs;
    }
    const clients = symbolObs.clients;
    if (clients.size === 0) {
      exAccountWs.tradeSubject.subs([rawSymbol]);
    }
    const clientId = this.clientId++;
    clients.add(clientId);
    return {
      obs: symbolObs.obs.asObservable(),
      unsubs: () => {
        clients.delete(clientId);
        if (clients.size === 0) {
          exAccountWs.tradeSubject.unsubs([rawSymbol]);
        }
      },
    };
  }

  async watchRtPrice(
    ex: ExchangeCode,
    symbol: string,
    params: WatchRtPriceParams,
  ): Promise<WatchRtPriceResult> {
    const { lowerBound, upperBound, timeoutSeconds } = params;
    const { obs, unsubs } = await this.subscribeRtPrice(ex, symbol);
    let price: number;
    const obs2 = obs.pipe(
      Rx.filter((rtPrice) => {
        price = rtPrice.price;
        return price < lowerBound || price > upperBound;
      }),
    );
    let $result = Rx.firstValueFrom(obs2, { defaultValue: unsubs });
    if (timeoutSeconds) {
      $result = Promise.race([
        $result,
        wait(timeoutSeconds * 1000).then(() => undefined),
      ]);
    }
    const result = await $result;
    unsubs();
    if (!result) {
      return {
        price,
        timeout: true,
      };
    }
    if (price <= lowerBound) {
      return { price, reachLower: true };
    }
    if (price >= upperBound) {
      return { price, reachUpper: true };
    }
  }

  private setupRtKlineReceiver(
    { klineSubjects, ws }: ExMarketWs,
    interval: string,
  ) {
    let klineSubject = klineSubjects[interval];
    if (klineSubject) {
      return;
    }
    klineSubject = ws.klineSubject(interval);
    klineSubjects[interval] = klineSubject;
    this.klineHandler
      .receiveWsKlines(interval, klineSubject)
      .subscribe((kl) => {
        const key = `${kl.ex}-${kl.symbol}-${interval}`;
        let symbolObs = this.rtKlineObs[key];
        if (!symbolObs) {
          symbolObs = {
            obs: new Subject<RtKline>(),
            clients: new Set<number>(),
          };
          this.rtKlineObs[key] = symbolObs;
        }
        symbolObs.obs.next(kl);
      });
  }

  async subscribeRtKline(
    ex: ExchangeCode,
    symbol: string,
    interval: string,
  ): Promise<{ obs: Observable<RtKline>; unsubs: () => void }> {
    await this.symbolService.ensureLoaded();
    const exchangeSymbol = this.symbolService.getExchangeSymbolByES(ex, symbol);
    const rawSymbol = exchangeSymbol.rawSymbol;
    const exMarketWs = this.getExMarketWs(ex, exchangeSymbol.market);

    this.setupRtKlineReceiver(exMarketWs, interval);

    const key = `${ex}-${symbol}-${interval}`;
    let symbolObs = this.rtKlineObs[key];
    if (!symbolObs) {
      symbolObs = {
        obs: new Subject<RtKline>(),
        clients: new Set<number>(),
      };
      this.rtKlineObs[key] = symbolObs;
    }
    const clients = symbolObs.clients;
    const klineSubject = exMarketWs.klineSubjects[interval];
    if (clients.size === 0) {
      klineSubject.subs([rawSymbol]);
    }
    const clientId = this.clientId++;
    clients.add(clientId);
    return {
      obs: symbolObs.obs.asObservable(),
      unsubs: () => {
        clients.delete(clientId);
        if (clients.size === 0) {
          klineSubject.unsubs([rawSymbol]);
        }
      },
    };
  }

  onApplicationShutdown(_signal?: string): any {
    this.logger.warn(`shutdown ...`);
  }
}
