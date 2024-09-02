import { wait } from '@/common/utils/utils';
import {
  exWsParams,
  observeWsStatus,
  observeWsSubject,
} from '@/common/test/test-utils.spec';
import { CoinbaseWsAdvanced } from '@/exchange/coinbase/coinbase-ws-advanced';

const symbol_BTC_USDT = 'BTC-USD';

const ws = new CoinbaseWsAdvanced(exWsParams());

jest.setTimeout(5000_000);

describe('coinbase-ws', () => {
  it('perp', async () => {
    observeWsStatus(ws);

    const subject = ws.tradeSubject();
    subject.subs([symbol_BTC_USDT]);

    observeWsSubject(subject.get());

    await wait(200_000);
    ws.shutdown();

    await wait(100_000);
  });
});
