import { wait } from '@/common/utils/utils';
import {
  exWsParams,
  observeWsStatus,
  observeWsSubject,
} from '@/common/test/test-utils.spec';
import { BinanceSpotMarginWs } from '@/exchange/binance/binance-spot-margin-ws';
import { BinanceUsdMWs } from '@/exchange/binance/binance-usd-m-ws';
import { BinanceCoinMWs } from '@/exchange/binance/binance-coin-m-ws';

const symbol_BTC_USDT = 'BTCUSDT';
const symbol_BTC_PERP_USDT = 'BTCUSDT';
const symbol_BTC_PERP_BTC = 'BTCUSD_PERP';

jest.setTimeout(5000_000);

describe('binance-ws', () => {
  it('spot', async () => {
    const ws = new BinanceSpotMarginWs(exWsParams());
    observeWsStatus(ws);

    const subject = ws.tradeSubject();
    subject.subs([symbol_BTC_USDT]);

    observeWsSubject(subject.get());

    await wait(200_000);
    ws.shutdown();

    await wait(100_000);
  });

  it('um', async () => {
    const ws = new BinanceUsdMWs(exWsParams());
    observeWsStatus(ws);

    const subject = ws.tradeSubject();
    subject.subs([symbol_BTC_PERP_USDT]);

    observeWsSubject(subject.get());

    await wait(200_000);
    ws.shutdown();

    await wait(100_000);
  });

  it('cm', async () => {
    const ws = new BinanceCoinMWs(exWsParams());
    observeWsStatus(ws);
    const subject = ws.tradeSubject();
    subject.subs([symbol_BTC_PERP_BTC]);

    observeWsSubject(subject.get());

    await wait(200_000);
    ws.shutdown();

    await wait(100_000);
  });
});
