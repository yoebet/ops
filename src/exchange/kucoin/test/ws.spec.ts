import {
  exWsParams,
  observeWsStatus,
  observeWsSubject,
} from '@/common/test/test-utils.spec';
import { wait } from '@/common/utils/utils';
import { KuCoinFuturesWs } from '@/exchange/kucoin/kucoin-futures-ws';
import { KuCoinSpotWs } from '@/exchange/kucoin/kucoin-spot-ws';

jest.setTimeout(5000_000);

describe('kucoin-ws', () => {
  it('Futures', async () => {
    const ws = new KuCoinFuturesWs(exWsParams());
    observeWsStatus(ws);

    const subject = ws.tradeSubject();
    subject.subs(['XBTUSDTM']);

    observeWsSubject(subject.get());

    await wait(200_000);
    ws.shutdown();

    await wait(100_000);
  });

  it('Spot', async () => {
    const ws = new KuCoinSpotWs(exWsParams());
    observeWsStatus(ws);

    const subject = ws.tradeSubject();
    subject.subs(['BTC-USDT']);

    observeWsSubject(subject.get());

    await wait(200_000);
    ws.shutdown();

    await wait(100_000);
  });
});
