import {
  exWsParams,
  observeWsStatus,
  observeWsSubject,
} from '@/common/test/test-utils.spec';
import { wait } from '@/common/utils/utils';
import { ByBitLinearWs } from '@/exchange/bybit/bybit-linear-ws';
import { ByBitInverseWs } from '@/exchange/bybit/bybit-inverse-ws';
import { ByBitSpot } from '@/exchange/bybit/bybit-spot';

jest.setTimeout(5000_000);

describe('bybit-ws', () => {
  it('spot', async () => {
    const ws = new ByBitSpot(exWsParams());
    observeWsStatus(ws);

    const subject = ws.tradeSubject();
    // subject.subs(['BTCUSDT', 'ETHUSDT']);
    subject.subs(['DOGEUSDT', 'SOLUSDT']);

    observeWsSubject(subject.get());

    await wait(200_000);
    ws.shutdown();

    await wait(100_000);
  });

  it('linear', async () => {
    const ws = new ByBitLinearWs(exWsParams());
    observeWsStatus(ws);

    const subject = ws.tradeSubject();
    subject.subs(['BTCUSDT', 'ETHUSDT']);

    observeWsSubject(subject.get());

    await wait(200_000);
    ws.shutdown();

    await wait(100_000);
  });

  it('inverse', async () => {
    const ws = new ByBitInverseWs(exWsParams());
    observeWsStatus(ws);

    const subject = ws.tradeSubject();
    subject.subs(['BTCUSD', 'ETHUSD']);

    observeWsSubject(subject.get());

    await wait(200_000);
    ws.shutdown();

    await wait(100_000);
  });
});
