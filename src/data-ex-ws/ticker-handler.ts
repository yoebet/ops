import * as Rx from 'rxjs';
import { AppLogger } from '@/common/app-logger';
import { SymbolService } from '@/common-services/symbol.service';
import { ExMarket, ExTrade } from '@/exchange/exchanges-types';
import { Trade } from '@/data-service/models/trade';
import {
  ChannelProducer,
  DataChannelService,
} from '@/data-service/data-channel.service';
import { RtPrice } from '@/data-service/models/realtime';
import { ExSymbolEnabled } from '@/db/models/ex-symbol-enabled';
import { ExAccountWs } from '@/data-ex-ws/ex-ws.service';

export class TickerHandler {
  private rtPriceProducer: ChannelProducer<RtPrice>;

  protected pricesMap = new Map<
    string,
    { ts: number; lastPrice?: number; price: number; exTimes: number }
  >();

  private priceCounterStartTs = 0;
  private publishPriceCount = 0;

  constructor(
    readonly symbolService: SymbolService,
    readonly dataChannelService: DataChannelService,
    readonly logger: AppLogger,
  ) {}

  static buildTrade(
    exTrade: ExTrade,
    exchangeSymbolWithSC: ExSymbolEnabled,
  ): Trade | undefined {
    const sc = exchangeSymbolWithSC.unifiedSymbol;
    const contractSize = +exchangeSymbolWithSC.contractSizeStr;
    const { market: market, base, quote } = sc;

    const csize = exTrade.size;
    if (contractSize && market) {
      exTrade.size = exTrade.size * contractSize;
      if (ExMarket.perp_inv == market && exTrade.price > 0) {
        exTrade.size = exTrade.size / exTrade.price;
      }
    }
    if (!exTrade.amount) {
      exTrade.amount = exTrade.size * exTrade.price;
    }

    const block = exTrade.amount >= 5000;

    const trade: Trade = {
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

  checkPriceNormal(trade: Trade): boolean {
    if (trade.price == 0) {
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
        if (percent >= 2.0) {
          this.logger?.warn(
            `abnormal price, symbol: ${symbolKey}, status: ${JSON.stringify(
              priceStatus,
            )}, change percent: ${percent} `,
          );
          this.logger?.debug(trade);
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

  async publishPrice(trade: Trade) {
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

  receiveWsTickers(exAccountWs: ExAccountWs) {
    const { ws, rawSymbols } = exAccountWs;
    ws.tradeSubject()
      .subs(rawSymbols)
      .get()
      .pipe(
        Rx.map((exTrade) => {
          const exchangeSymbol = this.symbolService.getExchangeSymbol(
            exTrade.exAccount,
            exTrade.rawSymbol,
          );
          if (!exchangeSymbol || !exchangeSymbol.unifiedSymbol) {
            return undefined;
          }
          return TickerHandler.buildTrade(exTrade, exchangeSymbol);
        }),
        Rx.filter((trade) => {
          if (!trade) {
            return false;
          }
          return this.checkPriceNormal(trade);
        }),
      )
      .subscribe(async (trade) => {
        await this.publishPrice(trade);
      });

    this.priceCounterStartTs = Date.now();
  }
}
