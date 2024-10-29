import { wait } from '@/common/utils/utils';
import {
  exWsParams,
  observeWsStatus,
  observeWsSubject,
} from '@/common/test/test-utils.spec';
import { BinanceSpotWs } from '@/exchange/binance/binance-spot-ws';

const symbol_BTC_USDT = 'BTCUSDT';
const symbol_ETH_USDT = 'ETHUSDT';

jest.setTimeout(5000_000);

describe('binance-ws', () => {
  it('spot', async () => {
    const ws = new BinanceSpotWs(exWsParams());
    observeWsStatus(ws);

    const subject = ws.tradeSubject();
    subject.subs([symbol_BTC_USDT]);

    observeWsSubject(subject.get());

    await wait(200_000);
    ws.shutdown();

    await wait(100_000);
  });

  it('spot kline', async () => {
    const ws = new BinanceSpotWs(exWsParams());
    // ws.logMessage = true;
    // observeWsStatus(ws);

    const subject = ws.klineSubject('1s');
    subject.subs([symbol_BTC_USDT, symbol_ETH_USDT]);

    observeWsSubject(subject.get());

    await wait(200_000);
    ws.shutdown();

    await wait(100_000);
  });
});
