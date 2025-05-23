import { OkxPublicWs } from '@/exchange/okx/okx-ws-public';
import { wait } from '@/common/utils/utils';
import {
  exWsParams,
  observeWsStatus,
  observeWsSubject,
} from '@/common/test/test-utils.spec';

const symbol_BTC_USDT = 'BTC-USDT';
const symbol_BTC_PERP_BTC = 'BTC-USD-SWAP';
const symbol_BTC_PERP_USDT = 'BTC-USDT-SWAP';

const ws = new OkxPublicWs(exWsParams());

jest.setTimeout(5000_000);

describe('okx-ws', () => {
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

  it('cm', async () => {
    observeWsStatus(ws);
    const subject = ws.tradeSubject();
    subject.subs([symbol_BTC_PERP_BTC]);

    observeWsSubject(subject.get());

    await wait(200_000);
    ws.shutdown();

    await wait(100_000);
  });

  it('kline', async () => {
    observeWsStatus(ws);
    // ws.logMessage = true;
    ws.candleIncludeLive = true;
    const subject = ws.klineSubject('1m');
    subject.subs([symbol_BTC_USDT]);

    observeWsSubject(subject.get());

    await wait(200_000);
    ws.shutdown();

    await wait(100_000);
  });
});
