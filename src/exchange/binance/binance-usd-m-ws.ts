import { BinanceWs } from '@/exchange/binance/binance-ws';
import { WsCapacities } from '@/exchange/ws-capacities';
import { ExWsParams } from '@/exchange/base/ws/ex-ws';
import { mergeId } from '@/exchange/base/ws/base-ws';
import { ExAccountCode } from '@/exchange/exchanges-types';

export class BinanceUsdMWs extends BinanceWs implements WsCapacities {
  constructor(params: Partial<ExWsParams>) {
    super(mergeId({ entityCode: ExAccountCode.binanceUsdM }, params));
    this.exAccountCode = ExAccountCode.binanceUsdM;
  }

  protected async address(): Promise<string> {
    return this.wsBaseUrl || `wss://fstream.binance.com/ws`;
  }
}
