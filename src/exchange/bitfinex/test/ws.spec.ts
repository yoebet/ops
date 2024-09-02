import { wait } from '@/common/utils/utils';
import {
  exWsParams,
  observeWsStatus,
  observeWsSubject,
} from '@/common/test/test-utils.spec';
import { BitfinexWs } from '@/exchange/bitfinex/bitfinex-ws';

const symbol_BTC_USDT = 'tBTCUST';
const symbol_BTC_PERP_USDT = 'tBTCF0:USTF0';

const ws = new BitfinexWs(exWsParams());

jest.setTimeout(5000_000);

describe('bifinex-ws', () => {
  it('spot', async () => {
    observeWsStatus(ws);

    const subject = ws.tradeSubject();
    subject.subs([symbol_BTC_USDT]);

    observeWsSubject(subject.get());

    await wait(200_000);
    ws.shutdown();

    await wait(100_000);
  });

  it('um', async () => {
    observeWsStatus(ws);

    const subject = ws.tradeSubject();
    subject.subs([symbol_BTC_PERP_USDT]);

    observeWsSubject(subject.get());

    await wait(200_000);
    ws.shutdown();

    await wait(100_000);
  });
});
