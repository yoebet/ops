import {
  ExWs,
  ExWsParams,
  WsChannelOp,
  WsSubscription,
} from '@/exchange/base/ws/ex-ws';
import { mergeId } from '@/exchange/base/ws/base-ws';
import { ExMarket } from '@/db/models/exchange-types';

export abstract class OkxBaseWs extends ExWs {
  protected constructor(params: Partial<ExWsParams>) {
    super(mergeId({}, params));
  }

  protected heartbeat(): void {
    super.send('ping');
  }

  protected async subscribeWsChannel(ss: WsSubscription[]): Promise<void> {
    await super.subscribeWsChannelChunked(ss, 500, 1000);
  }

  protected operateWsChannel(
    op: WsChannelOp,
    subscriptions: WsSubscription[],
  ): void {
    const req = {
      op: op.toLowerCase(),
      args: subscriptions.map((s) => ({
        channel: s.channel,
        instId: s.symbol,
      })),
    };
    this.sendJson(req);
  }

  protected checkMessage(obj) {
    const event = obj.event;
    if (event) {
      if (event === 'subscribe' || event === 'unsubscribe') {
        return false;
      }
      if (event === 'error') {
        this.logError(obj, 'onMessageObj');
        return false;
      }
      this.logger.warn(`unknown event: ${event}`);
    }
    return true;
  }

  evalExMarket(rawSymbol: string) {
    if (rawSymbol.endsWith('-USD-SWAP')) {
      return ExMarket.perp_inv;
    } else if (rawSymbol.endsWith('-SWAP')) {
      return ExMarket.perp;
    }
    return ExMarket.spot;
  }
}
