import {
  exWsParams,
  observeWsStatus,
  observeWsSubject,
} from '@/common/test/test-utils.spec';
import { wait } from '@/common/utils/utils';
import {
  ExWs,
  ExWsParams,
  WsChannelOp,
  WsSubscription,
} from '@/exchange/base/ws/ex-ws';
import { mergeId } from '@/exchange/base/ws/base-ws';
import { ExchangeCode } from '@/exchange/exchanges-types';
import { SymbolParamSubject } from '@/exchange/base/ws/ex-ws-subjects';

class TestWs extends ExWs {
  constructor(params?: Partial<ExWsParams>) {
    super(mergeId({ entityCode: ExchangeCode.okx }, params));
  }

  protected async address(): Promise<string> {
    return `wss://wsaws.okx.com:8443/ws/v5/public`;
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

  protected async onMessageObj(obj: any): Promise<void> {
    const event = obj.event;
    if (event) {
      if (event === 'subscribe' || event === 'unsubscribe') {
        return;
      }
      if (event === 'error') {
        this.logError(obj, 'onMessageObj');
        return;
      }
      this.logger.warn(`unknown event: ${event}`);
    }

    const channel = obj.arg?.channel;
    if (!channel) {
      return;
    }
    (obj.data as any[]).forEach((t) => {
      this.publishMessage(channel, t);
    });
  }

  forSubject(channel: string): SymbolParamSubject<any> {
    return this.symbolParamSubject(channel);
  }
}

// const symbolBtc = 'BTC-USDT-SWAP';
const symbolBtc = 'BTC-USDT';
const symbolEth = 'ETH-USDT';

const ws = new TestWs(exWsParams());

jest.setTimeout(5000_000);

test('trade', async () => {
  observeWsStatus(ws);
  const subject = ws.forSubject('trades').subs([symbolBtc]);
  observeWsSubject(subject.get());

  await wait(100_000);
});

test('ticker', async () => {
  observeWsStatus(ws);
  const subject = ws.forSubject('tickers').subs([symbolEth]);
  observeWsSubject(subject.get());

  await wait(100_000);
});
