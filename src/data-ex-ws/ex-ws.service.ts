import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import * as _ from 'lodash';
import { AppLogger } from '@/common/app-logger';
import { ExchangeWsService } from '@/exchange/exchange-ws.service';
import { SymbolService } from '@/common-services/symbol.service';
import { ExWsTypes } from '@/exchange/exchange-accounts';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { ConfigService } from '@nestjs/config';
import { TaskScope } from '@/common/server-profile.type';
import { ExAccountCode } from '@/exchange/exchanges-types';
import { DataChannelService } from '@/data-service/data-channel.service';
import { ExchangeWs } from '@/exchange/ws-capacities';
import { groupBy } from 'lodash';
import { ExSymbolEnabled } from '@/db/models/ex-symbol-enabled';
import { TickerHandler } from '@/data-ex-ws/ticker-handler';
import { KlineHandler } from '@/data-ex-ws/kline-handler';

export interface ExAccountWs {
  exAccount: ExAccountCode;
  ws: ExchangeWs;
  rawSymbols: string[];
}

@Injectable()
export class ExWsService implements OnApplicationShutdown {
  private runningWs = new Map<ExAccountCode, ExAccountWs>();

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
      logger.newLogger('ticker-handler'),
    );
    this.klineHandler = new KlineHandler(
      symbolService,
      dataChannelService,
      logger.newLogger('kline-handler'),
    );

    const ps = this.configService.get('exchange.socksProxies');
    this.agent = ps && ps.length > 0 ? new SocksProxyAgent(ps[0]) : undefined;
  }

  async start(profile: TaskScope) {
    this.logger.log(`:::: start ...`);

    await this.symbolService.ensureLoaded();

    const ess = await this.symbolService.getExchangeSymbols();
    if (ess.length == 0) {
      return;
    }
    const ea: keyof ExSymbolEnabled = 'exAccount';
    const accountSymbols = groupBy(ess, ea);
    const asps = _.toPairs(accountSymbols);

    for (const [exAccCode, exchangeSymbols] of asps) {
      const WsType = ExWsTypes[exAccCode];
      if (!WsType) {
        continue;
      }

      const runSymbols = exchangeSymbols.filter((s) => s.unifiedSymbol);
      if (runSymbols.length === 0) {
        continue;
      }
      if (profile && profile.exCodes && profile.exCodes.length > 0) {
        if (!profile.exCodes.includes(runSymbols[0].ex)) {
          continue;
        }
      }

      const rawSymbols = runSymbols.map((s) => s.rawSymbol);
      const ws = this.exchangeWsService.init(exAccCode, WsType, {
        idComponents: {},
        agent: this.agent,
        candleIncludeLive: false,
      });
      const exAcc = exAccCode as ExAccountCode;
      const exAccountWs: ExAccountWs = {
        exAccount: exAcc,
        ws,
        rawSymbols,
      };
      this.runningWs.set(exAcc, exAccountWs);

      this.tickerHandler.receiveWsTickers(exAccountWs);
      // this.klineHandler.receiveWsKlines(exAccountWs, '1s');

      this.logger.log(`start ws (${exAcc}): ${rawSymbols}`);
    }

    const exAccounts = [...this.runningWs.keys()];
    this.logger.log(`run ex-accounts: ${exAccounts.join(',')}`);
  }

  shutdown() {
    this.logger.warn(`shutdown ...`);
    this.exchangeWsService.shutdown();
  }

  onApplicationShutdown(_signal?: string): any {
    this.shutdown();
  }
}
