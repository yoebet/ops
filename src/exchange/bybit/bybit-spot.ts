import { WsCapacities } from '@/exchange/ws-capacities';
import { ByBitWs } from '@/exchange/bybit/bybit-ws';
import { ExWsParams } from '@/exchange/base/ws/ex-ws';
import { mergeId } from '@/exchange/base/ws/base-ws';
import { ExAccountCode } from '@/exchange/exchanges-types';

export class ByBitSpot extends ByBitWs implements WsCapacities {
  constructor(params: Partial<ExWsParams>) {
    super(mergeId({ entityCode: ExAccountCode.bybitSpot }, params));
    this.exAccountCode = ExAccountCode.bybitSpot;
  }

  protected async address(): Promise<string> {
    return this.wsBaseUrl || `wss://stream.bybit.com/v5/public/spot`;
  }
}
