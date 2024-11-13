import { ExRestParams } from '@/exchange/base/rest/rest.type';
import {
  ExchangeMarketDataService,
  ExchangeMarketDataWs,
  ExchangeTradeService,
} from '@/exchange/exchange-service-types';
import { ExMarket, ExTradeType } from '@/db/models/exchange-types';
import { ConfigService } from '@nestjs/config';
import { Config } from '@/common/config.types';
import { BaseExchange } from '@/exchange/base/base-exchange';
import { BinanceMarketSpot } from '@/exchange/binance/binance-market-spot';
import { BinanceSpotWs } from '@/exchange/binance/ws-spot';
import { BinanceTradeSpot } from '@/exchange/binance/binance-trade-spot';
import { BinanceTradeMargin } from '@/exchange/binance/binance-trade-margin';
import { ExWs } from '@/exchange/base/ws/ex-ws';

export class BinanceExchange extends BaseExchange {
  private marketDataSpot: ExchangeMarketDataService;
  private marketDataWs: ExchangeMarketDataWs;
  private tradeSpot: ExchangeTradeService;
  private tradeMargin: ExchangeTradeService;

  constructor(
    protected configService: ConfigService<Config>,
    protected params: Partial<ExRestParams>,
  ) {
    super(configService, params);
  }

  getExMarketDataService(market: ExMarket): ExchangeMarketDataService {
    if (market === ExMarket.spot) {
      if (!this.marketDataSpot) {
        this.marketDataSpot = new BinanceMarketSpot(this.params);
      }
      return this.marketDataSpot;
    }
    throw new Error(`Not implemented for ${market}`);
  }

  getExMarketDataWs(market: ExMarket): ExchangeMarketDataWs {
    if (market === ExMarket.spot) {
      if (!this.marketDataWs) {
        this.marketDataWs = new BinanceSpotWs({
          agent: this.agent,
          candleIncludeLive: false,
        });
      }
      return this.marketDataWs;
    }
    throw new Error(`Not implemented for ${market}`);
  }

  getExTradeService(tradeType: ExTradeType): ExchangeTradeService {
    if (tradeType === ExTradeType.spot) {
      if (!this.tradeSpot) {
        this.tradeSpot = new BinanceTradeSpot(this.params);
      }
      return this.tradeSpot;
    } else if (tradeType === ExTradeType.margin) {
      if (!this.tradeMargin) {
        this.tradeMargin = new BinanceTradeMargin(this.params);
      }
      return this.tradeMargin;
    }
    throw new Error(`Not implemented for ${tradeType}`);
  }

  shutdown() {
    super.shutdown();
    if (this.marketDataWs) {
      (this.marketDataWs as any as ExWs).shutdown();
    }
  }
}
