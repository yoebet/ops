import { WsCapacities } from '@/exchange/ws-capacities';
import { BinanceWs } from '@/exchange/binance/binance-ws';
import { ExWsParams } from '@/exchange/base/ws/ex-ws';
import { mergeId } from '@/exchange/base/ws/base-ws';
import { ExAccountCode } from '@/exchange/exchanges-types';

export class BinanceSpotMarginWs extends BinanceWs implements WsCapacities {
  constructor(params: Partial<ExWsParams>) {
    super(mergeId({ entityCode: ExAccountCode.binanceSpotMargin }, params));
    this.exAccountCode = ExAccountCode.binanceSpotMargin;
  }

  protected async address(): Promise<string> {
    return this.wsBaseUrl || `wss://stream.binance.com:9443/ws`;
  }
}
