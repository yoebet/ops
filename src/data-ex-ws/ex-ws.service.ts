import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import * as _ from 'lodash';
import { AppLogger } from '@/common/app-logger';
import { ExchangeWsService } from '@/exchange/exchange-ws.service';
import { SymbolService } from '@/common-services/symbol.service';
import { ExWsTypes } from '@/exchange/exchange-accounts';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { ConfigService } from '@nestjs/config';
import { TaskScope } from '@/common/server-profile.type';
import { ExAccountCode, ExchangeCode } from '@/db/models/exchange-types';
import { DataChannelService } from '@/data-service/data-channel.service';
import { ExchangeWs } from '@/exchange/ws-types';
import { TickerHandler } from '@/data-ex-ws/ticker-handler';
import { KlineHandler } from '@/data-ex-ws/kline-handler';
import { SymbolParamSubject } from '@/exchange/base/ws/ex-ws-subjects';
import { Observable, Subject } from 'rxjs';
import { RtKline, RtPrice } from '@/data-service/models/realtime';
import { ExKlineWithSymbol, ExTrade } from '@/exchange/rest-types';

interface ExAccountWs {
  exAccount: ExAccountCode;
  ws: ExchangeWs;
  tradeSubject?: SymbolParamSubject<ExTrade>;
  // tradeObs?: Observable<Trade>;
  klineSubjects: {
    [interval: string]: SymbolParamSubject<ExKlineWithSymbol>;
  };
}

@Injectable()
export class ExWsService implements OnApplicationShutdown {
  private runningWs = new Map<ExAccountCode, ExAccountWs>();
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

  private agent: SocksProxyAgent;

  constructor(
    readonly configService: ConfigService,
    readonly symbolService: SymbolService,
    readonly exchangeWsService: ExchangeWsService,
    readonly dataChannelService: DataChannelService,
    readonly logger: AppLogger,
  ) {
    logger.setContext('ex-ws-service');
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

    const ps = this.configService.get('exchange.socksProxies');
    this.agent = ps && ps.length > 0 ? new SocksProxyAgent(ps[0]) : undefined;
  }

  async start(_profile: TaskScope) {}

  private getExAccountWs(exAccount: ExAccountCode): ExAccountWs {
    let exAccountWs = this.runningWs.get(exAccount);
    if (exAccountWs) {
      return exAccountWs;
    }
    const WsType = ExWsTypes[exAccount];
    if (!WsType) {
      throw new Error(`no ExWs for ${exAccount}`);
    }
    const ws = this.exchangeWsService.init(exAccount, WsType, {
      idComponents: {},
      agent: this.agent,
      candleIncludeLive: false,
    });
    exAccountWs = {
      exAccount,
      ws,
      klineSubjects: {},
    };
    this.runningWs.set(exAccount, exAccountWs);
    return exAccountWs;
  }

  private setupRtPriceReceiver(exAccountWs: ExAccountWs) {
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
    const exAccount = this.symbolService.getExAccount(ex, symbol);
    const rawSymbol = this.symbolService.getRawSymbol(exAccount, symbol);
    const exAccountWs = this.getExAccountWs(exAccount);

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

  private setupRtKlineReceiver(exAccountWs: ExAccountWs, interval: string) {
    const klineSubjects = exAccountWs.klineSubjects;
    let klineSubject = klineSubjects[interval];
    if (klineSubject) {
      return;
    }
    klineSubject = exAccountWs.ws.klineSubject(interval);
    klineSubjects[interval] = klineSubject;
    this.klineHandler
      .receiveWsKlines(exAccountWs.exAccount, interval, klineSubject)
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
    const exAccount = this.symbolService.getExAccount(ex, symbol);
    const rawSymbol = this.symbolService.getRawSymbol(exAccount, symbol);
    const exAccountWs = this.getExAccountWs(exAccount);

    this.setupRtKlineReceiver(exAccountWs, interval);

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
    const klineSubject = exAccountWs.klineSubjects[interval];
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

  shutdown() {
    this.logger.warn(`shutdown ...`);
    this.exchangeWsService.shutdown();
  }

  onApplicationShutdown(_signal?: string): any {
    this.shutdown();
  }
}
