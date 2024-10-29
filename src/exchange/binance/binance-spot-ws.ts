import { ExchangeWs } from '@/exchange/ws-capacities';
import { BinanceWs } from '@/exchange/binance/binance-ws';
import { ExWsParams } from '@/exchange/base/ws/ex-ws';
import { mergeId } from '@/exchange/base/ws/base-ws';
import { ExAccountCode } from '@/exchange/exchanges-types';

export class BinanceSpotWs extends BinanceWs implements ExchangeWs {
  constructor(params: Partial<ExWsParams>) {
    super(mergeId({ entityCode: ExAccountCode.binanceSpot }, params));
    this.exAccountCode = ExAccountCode.binanceSpot;
  }

  protected async address(): Promise<string> {
    return this.wsBaseUrl || `wss://stream.binance.com:9443/ws`;
  }
}
