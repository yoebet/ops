import {
  exWsParams,
  observeWsStatus,
  observeWsSubject,
} from '@/common/test/test-utils.spec';
import { wait } from '@/common/utils/utils';
import { BitMexWs } from '@/exchange/bitmex/bitmex-ws';

jest.setTimeout(5000_000);

describe('bitmex-ws', () => {
  it('unified', async () => {
    const ws = new BitMexWs(exWsParams());
    observeWsStatus(ws);

    const subject = ws.tradeSubject();
    subject.subs(['XBTUSDT', 'XBTUSD']);

    observeWsSubject(subject.get());

    await wait(200_000);
    ws.shutdown();

    await wait(100_000);
  });
});
