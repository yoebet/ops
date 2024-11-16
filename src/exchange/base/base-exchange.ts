import { ExApiKey, ExRestParams } from '@/exchange/base/rest/rest.type';
import {
  ExchangeFacade,
  ExchangeMarketDataService,
  ExchangeMarketDataWs,
  ExchangePrivateDataWs,
  ExchangeTradeService,
} from '@/exchange/exchange-service-types';
import { AppLogger } from '@/common/app-logger';
import { ExMarket, ExTradeType } from '@/db/models/exchange-types';
import { ConfigService } from '@nestjs/config';
import { Config } from '@/common/config.types';
import { SocksProxyAgent } from 'socks-proxy-agent';

export class BaseExchange implements ExchangeFacade {
  protected readonly logger: AppLogger;
  protected proxies: string[];
  protected agent: SocksProxyAgent;

  constructor(
    protected configService: ConfigService<Config>,
    protected params: Partial<ExRestParams>,
  ) {
    this.logger = params.logger || AppLogger.build(this.constructor.name);
    this.proxies = this.configService.get('exchange.socksProxies' as any);
    this.agent =
      this.proxies && this.proxies.length > 0
        ? new SocksProxyAgent(this.proxies[0])
        : undefined;
  }

  getExMarketDataService(market: ExMarket): ExchangeMarketDataService {
    throw new Error(`Not implemented for ${market}`);
  }

  getExMarketDataWs(market: ExMarket): ExchangeMarketDataWs {
    throw new Error(`Not implemented for ${market}`);
  }

  getExTradeService(tradeType: ExTradeType): ExchangeTradeService {
    throw new Error(`Not implemented for ${tradeType}`);
  }

  getExPrivateDataWs(
    apiKey: ExApiKey,
    tradeType: ExTradeType,
  ): ExchangePrivateDataWs {
    throw new Error(`Not implemented for ${tradeType}`);
  }

  shutdown() {}
}
