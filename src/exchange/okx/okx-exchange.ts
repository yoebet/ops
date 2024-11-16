import { ExApiKey, ExRestParams } from '@/exchange/base/rest/rest.type';
import {
  ExchangeMarketDataService,
  ExchangeMarketDataWs,
  ExchangePrivateDataWs,
  ExchangeTradeService,
  SyncOrder,
} from '@/exchange/exchange-service-types';
import { ExMarket, ExTradeType } from '@/db/models/exchange-types';
import { ConfigService } from '@nestjs/config';
import { Config } from '@/common/config.types';
import { BaseExchange } from '@/exchange/base/base-exchange';
import { OkxMarketData } from '@/exchange/okx/okx-market-data';
import { OkxPublicWs } from '@/exchange/okx/okx-ws-public';
import { OkxTradeSpot } from '@/exchange/okx/okx-trade-spot';
import { OkxTradeMargin } from '@/exchange/okx/okx-trade-margin';
import { OkxWsPrivate } from '@/exchange/okx/okx-ws-private';
import { InstType } from '@/exchange/okx/types';
import { NoParamSubject } from '@/exchange/base/ws/ex-ws-subjects';

export class OkxExchange extends BaseExchange {
  private marketDataService: ExchangeMarketDataService;
  private marketDataWs: ExchangeMarketDataWs;
  private tradeSpot: ExchangeTradeService;
  private tradeMargin: ExchangeTradeService;
  private privateWsMap = new Map<string, ExchangePrivateDataWs>();

  constructor(
    protected configService: ConfigService<Config>,
    protected params: Partial<ExRestParams>,
  ) {
    super(configService, params);
  }

  getExMarketDataService(_market: ExMarket): ExchangeMarketDataService {
    if (!this.marketDataService) {
      this.marketDataService = new OkxMarketData(this.params);
    }
    return this.marketDataService;
  }

  getExMarketDataWs(_market: ExMarket): ExchangeMarketDataWs {
    if (!this.marketDataWs) {
      this.marketDataWs = new OkxPublicWs({
        agent: this.agent,
        candleIncludeLive: false,
      });
    }
    return this.marketDataWs;
  }

  getExTradeService(tradeType: ExTradeType): ExchangeTradeService {
    if (tradeType === ExTradeType.spot) {
      if (!this.tradeSpot) {
        this.tradeSpot = new OkxTradeSpot(this.params);
      }
      return this.tradeSpot;
    } else if (tradeType === ExTradeType.margin) {
      if (!this.tradeMargin) {
        this.tradeMargin = new OkxTradeMargin(this.params);
      }
      return this.tradeMargin;
    }
    throw new Error(`Not implemented for ${tradeType}`);
  }

  private tradeTypeToInstType(tradeType: ExTradeType): InstType {
    if (tradeType === ExTradeType.spot) {
      return 'SPOT';
    }
    if (tradeType === ExTradeType.margin) {
      return 'MARGIN';
    }
    if (tradeType === ExTradeType.perp) {
      return 'SWAP';
    }
    return 'SPOT';
  }

  getExPrivateDataWs(
    apiKey: ExApiKey,
    tradeType: ExTradeType,
  ): ExchangePrivateDataWs {
    const key = apiKey.key;
    let ws = this.privateWsMap.get(key);
    if (!ws) {
      ws = new OkxWsPrivate(apiKey, { agent: this.agent });
      this.privateWsMap.set(key, ws);
    }
    const instType = this.tradeTypeToInstType(tradeType);

    return {
      orderSubject(): NoParamSubject<SyncOrder> {
        return (ws as OkxWsPrivate).instOrderSubject(instType);
      },
      shutdown() {
        ws.shutdown();
        this.privateWsMap.remove(key);
      },
    };
  }

  shutdown() {
    super.shutdown();
    this.marketDataWs?.shutdown();
    for (const ws of this.privateWsMap.values()) {
      ws.shutdown();
    }
  }
}
