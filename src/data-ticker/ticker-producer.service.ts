import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import * as _ from 'lodash';
import * as Rx from 'rxjs';
import { AppLogger } from '@/common/app-logger';
import { ExchangeWsService } from '@/exchange/exchange-ws.service';
import { SymbolService } from '@/common-services/symbol.service';
import { SymbolConfig } from '@/db/models/symbol-config';
import { ExWsTypes } from '@/exchange/exchange-accounts';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { Config } from '@/common/config.types';
import { ConfigService } from '@nestjs/config';
import { TaskScope } from '@/common/server-profile.type';
import { ExAccountCode, ExMarket, ExTrade } from '@/exchange/exchanges-types';
import { MarketDataService } from '@/data-service/market-data.service';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';
import { Trade1 } from '@/data-service/models/trade1';
import {
  ChannelProducer,
  DataChannelService,
} from '@/data-service/data-channel.service';
import { RtPrice, RtTicker } from '@/data-service/models/realtime';
import { CapableWs, TradeChannelEvent } from '@/exchange/ws-capacities';
import { groupBy } from 'lodash';
import { ExchangeSymbolEnabled } from '@/db/models/exchange-symbol-enabled';
import { TradeAbnormal } from '@/db/models/trade-abnormal';

export interface ExAccountWs {
  ws: CapableWs;
  rawSymbols: string[];
}

export interface TradeTap {
  (trade: Trade1): Promise<void>;
}

@Injectable()
export class TickerProducerService implements OnApplicationShutdown {
  private runningExAccounts = new Map<ExAccountCode, ExAccountWs>();

  private tradeTaps: [string, TradeTap][] = [];

  private tickerProducer: ChannelProducer<RtTicker>;
  private rtPriceProducer: ChannelProducer<RtPrice>;

  protected pricesMap = new Map<
    string,
    { ts: number; lastPrice?: number; price: number; exTimes: number }
  >();

  // exAccount Merged
  readonly tradesSubject = new Rx.Subject<Trade1>();

  readonly tradeChannelEvent = new Rx.Subject<TradeChannelEvent>();

  private priceCounterStartTs = 0;
  private publishPriceCount = 0;
  private saveTradeCounterStartTs = 0;
  private saveTradeCount = 0;

  constructor(
    readonly configService: ConfigService<Config>,
    readonly symbolService: SymbolService,
    readonly exchangeWsService: ExchangeWsService,
    readonly marketDataService: MarketDataService,
    readonly dataChannelService: DataChannelService,
    readonly logger: AppLogger,
  ) {
    logger.setContext('ticker-producer');
  }

  addTradeTap(key: string, tap: TradeTap) {
    const kt = this.tradeTaps.find(([k, t]) => k === key);
    if (kt) {
      kt[1] = tap;
      return;
    }
    this.tradeTaps.push([key, tap]);
  }

  removeTapTrade(key: string) {
    const idx = this.tradeTaps.findIndex(([k, t]) => k === key);
    if (idx) {
      this.tradeTaps.splice(idx, 1);
    }
  }

  async start(profile: TaskScope) {
    this.logger.log(`:::: start ...`);

    const ess = await this.symbolService.getExchangeSymbols();
    if (ess.length == 0) {
      return;
    }
    const ea: keyof ExchangeSymbolEnabled = 'exAccount';
    const accountSymbols = groupBy(ess, ea);
    const asps = _.toPairs(accountSymbols);

    const agentUrl = this.configService.get<string>('wsAgentUrl');
    const agent = agentUrl ? new SocksProxyAgent(agentUrl) : undefined;

    for (const [exAccCode, exchangeSymbols] of asps) {
      const WsType = ExWsTypes[exAccCode];
      if (!WsType) {
        continue;
      }

      const runSymbols = exchangeSymbols.filter((s) => s.symbolConfig);
      if (runSymbols.length === 0) {
        continue;
      }
      //如果指定了交易所
      if (profile && profile.exCodes && profile.exCodes.length > 0) {
        if (!profile.exCodes.includes(runSymbols[0].ex)) {
          continue;
        }
      }

      const rawSymbols = runSymbols.map((s) => s.rawSymbol);
      const ws = this.exchangeWsService.init(exAccCode, WsType, {
        idComponents: {},
        agent,
      });
      const exAccountWs: ExAccountWs = {
        ws,
        rawSymbols,
      };
      const exAcc = exAccCode as ExAccountCode;
      this.runningExAccounts.set(exAcc, exAccountWs);
      ws.tradeSubject().subs(rawSymbols);
      this.receiveWsTickers(exAccountWs, exAcc);
      this.logger.log(`start ws (${exAcc}): ${rawSymbols}`);

      ws.tradeConnectionEvent().subscribe((e) => {
        // this.logger.log(e, `trade-connection-event:${exAccCode}`);
        this.tradeChannelEvent.next(e);
      });
    }

    if (this.runningExAccounts.size === 0) {
      return;
    }

    const exAccounts = [...this.runningExAccounts.keys()];
    this.logger.log(`run ex-accounts: ${exAccounts.join(',')}`);

    const now = Date.now();
    this.priceCounterStartTs = now;
    this.saveTradeCounterStartTs = now;

    // this.addTradeTap('publishTicker', this.publishTicker.bind(this));
    this.addTradeTap('publishPrice', this.publishPrice.bind(this));

    this.tradesSubject
      .pipe(
        Rx.bufferTime(
          200, // bufferTimeSpan, ms
          null,
          100, // maxBufferSize
        ),
        Rx.filter((trades) => trades.length > 0),
      )
      .subscribe(async (trades) => {
        // console.log(trades);
        const saved = await this.marketDataService.saveTrades(trades);
        this.saveTradeCount += saved;

        const now = Date.now();
        if (
          this.saveTradeCount > 1000 ||
          now - this.saveTradeCounterStartTs > 60_000
        ) {
          this.logger.debug(`save trades: ${this.saveTradeCount}`);
          this.saveTradeCount = 0;
          this.saveTradeCounterStartTs = now;
        }
      });
  }

  static buildTrade(
    exTrade: ExTrade,
    exchangeSymbolWithSC: ExchangeSymbolEnabled,
  ): Trade1 | undefined {
    const sc = exchangeSymbolWithSC.symbolConfig;
    const contractSize = +exchangeSymbolWithSC.contractSizeStr;
    const { market: market, base, quote, sizeTicker, amountTicker } = sc;

    const csize = exTrade.size;
    if (contractSize && market) {
      exTrade.size = exTrade.size * contractSize;
      if (ExMarket.perp_inverse == market && exTrade.price > 0) {
        exTrade.size = exTrade.size / exTrade.price;
      }
    }
    if (!exTrade.amount) {
      exTrade.amount = exTrade.size * exTrade.price;
    }

    const block =
      (sizeTicker && exTrade.size >= 20 * sizeTicker) ||
      (amountTicker && exTrade.amount >= 40 * amountTicker);

    const trade: Trade1 = {
      ex: exTrade.ex,
      market,
      symbol: exchangeSymbolWithSC.symbol,
      base,
      quote,
      time: new Date(+exTrade.ts),
      csize,
      size: exTrade.size,
      amount: exTrade.amount,
      price: exTrade.price,
      tradeId: exTrade.tradeId,
      side: exTrade.side,
      block: block ? 1 : 0,
    };

    return trade;
  }

  checkPriceNormal(trade: Trade1): boolean {
    if (trade.price == 0) {
      const tab = new TradeAbnormal();
      tab.time = trade.time;
      tab.ex = trade.ex;
      tab.symbol = trade.symbol;
      tab.tradeId = trade.tradeId;
      tab.side = trade.side;
      tab.size = trade.size;
      tab.amount = trade.amount;
      tab.price = trade.price;
      tab.csize = trade.csize;
      tab.block = trade.block;
      tab.status = 'reject';
      tab.memo = `price: 0`;
      TradeAbnormal.save(tab).catch((e) => this.logger.error(e));
      return false;
    }
    const symbolKey = `${trade.ex}-${trade.symbol}`;
    const priceStatus = this.pricesMap.get(symbolKey);
    const lastPrice = priceStatus?.price;
    const thisPrice = trade.price;
    const tsNow = Date.now();
    if (priceStatus) {
      if (
        priceStatus.lastPrice > 0 &&
        tsNow - priceStatus.ts < 5000 &&
        priceStatus.exTimes < 3
      ) {
        const percent = (Math.abs(thisPrice - lastPrice) / lastPrice) * 100.0;
        if (percent >= 10.0) {
          this.logger?.warn(
            `abnormal price, symbol: ${symbolKey}, status: ${JSON.stringify(
              priceStatus,
            )}, change percent: ${percent} `,
          );
          this.logger?.debug(trade);
          priceStatus.ts = tsNow;
          priceStatus.exTimes++;
          const tab = new TradeAbnormal();
          tab.time = trade.time;
          tab.ex = trade.ex;
          tab.symbol = trade.symbol;
          tab.tradeId = trade.tradeId;
          tab.side = trade.side;
          tab.size = trade.size;
          tab.amount = trade.amount;
          tab.price = trade.price;
          tab.csize = trade.csize;
          tab.block = trade.block;
          tab.status = 'pending';
          tab.memo = `last-price: ${lastPrice}`;
          TradeAbnormal.save(tab).catch((e) => this.logger.error(e));
          return false;
        }
      }
    }
    this.pricesMap.set(symbolKey, {
      ts: tsNow,
      lastPrice,
      price: thisPrice,
      exTimes: 0,
    });

    return true;
  }

  async publishTicker(trade: Trade1) {
    const ticker: RtTicker = {
      ts: trade.time.getTime(),
      symbol: trade.symbol,
      ex: trade.ex,
      amount: trade.amount,
      price: trade.price,
      side: trade.side,
      size: trade.size,
      tradeId: trade.tradeId,
    };
    if (!this.tickerProducer) {
      this.tickerProducer =
        await this.dataChannelService.getTickerProducer('tickers');
    }
    const topic = this.dataChannelService.getTickerTopic(trade.base);
    await this.tickerProducer.produce(topic, ticker);
  }

  async publishPrice(trade: Trade1) {
    const now = Date.now();
    const symbolKey = `${trade.ex}-${trade.symbol}`;
    const priceStatus = this.pricesMap.get(symbolKey);
    if (priceStatus) {
      if (priceStatus.exTimes > 0) {
        return;
      }
      if (priceStatus.lastPrice === trade.price) {
        // this.logger.debug(`price equal: ${symbolKey}, ${trade.price}`);
        if (now - priceStatus.ts < 10_000) {
          return;
        }
      }
    }

    const rtPrice: RtPrice = {
      ts: trade.time.getTime(),
      symbol: trade.symbol,
      ex: trade.ex,
      price: trade.price,
    };
    if (!this.rtPriceProducer) {
      this.rtPriceProducer =
        await this.dataChannelService.getPriceProducer('prices');
    }
    const topic = this.dataChannelService.getPriceTopic(trade.base);
    await this.rtPriceProducer.produce(topic, rtPrice);

    this.publishPriceCount++;
    if (
      this.publishPriceCount > 1000 ||
      now - this.priceCounterStartTs > 60_000
    ) {
      this.logger.debug(`published price: ${this.publishPriceCount}`);
      this.publishPriceCount = 0;
      this.priceCounterStartTs = now;
    }
  }

  receiveWsTickers = (exAccountWs: ExAccountWs, exAcc: ExAccountCode) => {
    const { ws } = exAccountWs;
    ws.tradeSubject()
      .get()
      .pipe(
        Rx.map((exTrade) => {
          const exchangeSymbol = this.symbolService.getExchangeSymbol(
            exTrade.exAccount,
            exTrade.rawSymbol,
          );
          if (!exchangeSymbol || !exchangeSymbol.symbolConfig) {
            return undefined;
          }
          return TickerProducerService.buildTrade(exTrade, exchangeSymbol);
        }),
        Rx.filter((trade) => {
          if (!trade) {
            return false;
          }
          return this.checkPriceNormal(trade);
        }),
        Rx.tap(async (trade) => {
          for (const [key, tt] of this.tradeTaps) {
            tt(trade).catch((e) => this.logger.error(e, `trade-tap:${key}`));
          }
        }),
      )
      .subscribe((trade) => {
        this.tradesSubject.next(trade);
      });
  };

  shutdown() {
    this.logger.warn(`shutdown ...`);
    this.exchangeWsService.shutdown();
    this.runningExAccounts.clear();
  }

  onApplicationShutdown(signal?: string): any {
    this.shutdown();
  }
}
