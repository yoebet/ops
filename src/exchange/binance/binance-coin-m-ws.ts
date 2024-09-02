import { BinanceWs } from '@/exchange/binance/binance-ws';
import { WsCapacities } from '@/exchange/ws-capacities';
import { ExWsParams } from '@/exchange/base/ws/ex-ws';
import { mergeId } from '@/exchange/base/ws/base-ws';
import { ExAccountCode } from '@/exchange/exchanges-types';

export class BinanceCoinMWs extends BinanceWs implements WsCapacities {
  constructor(params: Partial<ExWsParams>) {
    super(mergeId({ entityCode: ExAccountCode.binanceCoinM }, params));
    this.exAccountCode = ExAccountCode.binanceCoinM;
  }

  protected async address(): Promise<string> {
    return this.wsBaseUrl || `wss://dstream.binance.com/ws`;
  }
}
