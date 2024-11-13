import { BinanceWs } from '@/exchange/binance/ws';
import { ExWsParams } from '@/exchange/base/ws/ex-ws';
import { ExMarket } from '@/db/models/exchange-types';

import { ExchangeMarketDataWs } from '@/exchange/exchange-service-types';

export class BinanceSpotWs extends BinanceWs implements ExchangeMarketDataWs {
  constructor(params: Partial<ExWsParams>) {
    super(params);
    this.market = ExMarket.spot;
  }

  protected async address(): Promise<string> {
    return this.wsBaseUrl || `wss://stream.binance.com:9443/ws`;
  }
}
