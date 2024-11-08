import * as Rx from 'rxjs';
import { Observable } from 'rxjs';
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
import { SymbolParamSubject } from '@/exchange/base/ws/ex-ws-subjects';

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
    readonly publishToChannel: boolean,
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

  private buildRtPrice(trade: Trade) {
    const symbolKey = `${trade.ex}-${trade.symbol}`;
    const priceStatus = this.pricesMap.get(symbolKey);
    if (priceStatus) {
      if (priceStatus.exTimes > 0) {
        return undefined;
      }
      if (priceStatus.lastPrice === trade.price) {
        // this.logger.debug(`price equal: ${symbolKey}, ${trade.price}`);
        const now = Date.now();
        if (now - priceStatus.ts < 10_000) {
          return undefined;
        }
      }
    }

    const rtPrice: RtPrice = {
      ts: trade.time.getTime(),
      base: trade.base,
      symbol: trade.symbol,
      ex: trade.ex,
      price: trade.price,
    };
    return rtPrice;
  }

  async publishPrice(rtPrice: RtPrice) {
    if (!this.rtPriceProducer) {
      this.rtPriceProducer =
        await this.dataChannelService.getPriceProducer('prices');
    }
    const topic = this.dataChannelService.getPriceTopic(rtPrice.base);
    await this.rtPriceProducer.produce(topic, rtPrice);

    const now = Date.now();
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

  receiveWsTickers(
    tradeSubject: SymbolParamSubject<ExTrade>,
  ): Observable<RtPrice> {
    this.priceCounterStartTs = Date.now();
    return tradeSubject.get().pipe(
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
      Rx.map((trade) => this.buildRtPrice(trade)),
      Rx.filter((price) => !!price),
      Rx.tap((price) => {
        if (this.publishToChannel) {
          this.publishPrice(price).catch((e) => this.logger.error(e));
        }
      }),
    );
  }
}
