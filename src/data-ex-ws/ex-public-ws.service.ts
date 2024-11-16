import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { AppLogger } from '@/common/app-logger';
import { SymbolService } from '@/common-services/symbol.service';
import { ConfigService } from '@nestjs/config';
import { ExchangeCode, ExMarket } from '@/db/models/exchange-types';
import { DataChannelService } from '@/data-service/data-channel.service';
import { TickerHandler } from '@/data-ex-ws/ticker-handler';
import { KlineHandler } from '@/data-ex-ws/kline-handler';
import { SymbolParamSubject } from '@/exchange/base/ws/ex-ws-subjects';
import { Observable, Subject } from 'rxjs';
import { RtKline, RtPrice } from '@/data-service/models/realtime';
import {
  ExWsKline,
  ExTrade,
  ExchangeMarketDataWs,
} from '@/exchange/exchange-service-types';
import { Exchanges } from '@/exchange/exchanges';

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

  private tickerHandler: TickerHandler;
  private klineHandler: KlineHandler;

  constructor(
    readonly configService: ConfigService,
    readonly symbolService: SymbolService,
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
