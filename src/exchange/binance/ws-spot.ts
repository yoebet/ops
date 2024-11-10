import { ExchangeWs } from '@/exchange/ws-types';
import { BinanceWs } from '@/exchange/binance/ws';
import { ExWsParams } from '@/exchange/base/ws/ex-ws';
import { mergeId } from '@/exchange/base/ws/base-ws';
import { ExAccountCode } from '@/db/models/exchange-types';

export class BinanceSpotWs extends BinanceWs implements ExchangeWs {
  constructor(params: Partial<ExWsParams>) {
    super(mergeId({ entityCode: ExAccountCode.binanceSpot }, params));
    this.exAccountCode = ExAccountCode.binanceSpot;
  }

  protected async address(): Promise<string> {
    return this.wsBaseUrl || `wss://stream.binance.com:9443/ws`;
  }
}
