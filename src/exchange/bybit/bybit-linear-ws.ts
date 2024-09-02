import { WsCapacities } from '@/exchange/ws-capacities';
import { ByBitWs } from '@/exchange/bybit/bybit-ws';
import { ExWsParams } from '@/exchange/base/ws/ex-ws';
import { mergeId } from '@/exchange/base/ws/base-ws';
import { ExAccountCode } from '@/exchange/exchanges-types';

export class ByBitLinearWs extends ByBitWs implements WsCapacities {
  constructor(params: Partial<ExWsParams>) {
    super(mergeId({ entityCode: ExAccountCode.bybitUsdM }, params));
    this.exAccountCode = ExAccountCode.bybitUsdM;
  }

  protected async address(): Promise<string> {
    return this.wsBaseUrl || `wss://stream.bybit.com/v5/public/linear`;
  }
}
