import { wait } from '@/common/utils/utils';
import { OkxRest } from '@/exchange/okx/rest';
import { TestConfig } from '@/env.local.tset';

const symbolBtcSpot = 'BTC-USDT';
const symbolBtcUM = 'BTC-USDC-SWAP';

const proxyUrls = TestConfig.exchange.socksProxies;

jest.setTimeout(5000_000);

describe('REST', () => {
  it('spot', async () => {
    const restCnt = new OkxRest({ proxies: proxyUrls });
    const result = await restCnt.getKlines({
      symbol: symbolBtcSpot,
      interval: '1m',
      limit: 10,
    });
    console.log(result);
  });

  it('spot 2', async () => {
    const restCnt = new OkxRest({ proxies: proxyUrls });
    const result = await restCnt.getKlines({
      symbol: symbolBtcSpot,
      interval: '1d',
      startTime: new Date('2024-10-21').getTime(),
      endTime: new Date('2024-10-31').getTime(),
      limit: 20,
    });
    result.forEach((k) => {
      k['t'] = new Date(k.ts).toISOString();
    });
    // got 22-30
    console.log(result);
  });

  it('trade spot', async () => {
    const restCnt = new OkxRest({ proxies: proxyUrls });
    const result = await restCnt.getTrades({
      symbol: symbolBtcSpot,
      limit: 100,
    });
    console.log(result);
  });

  it('trade swap', async () => {
    const restCnt = new OkxRest({
      proxies: proxyUrls,
    });
    const result = await restCnt.getTrades({
      symbol: symbolBtcUM,
      limit: 100,
    });
    console.log(result);
  });

  it('symbol info', async () => {
    const restCnt = new OkxRest({
      proxies: proxyUrls,
    });
    const result = await restCnt.getSymbolInfo(symbolBtcSpot);
    console.log(result);
  });

  it('price', async () => {
    const restCnt = new OkxRest({
      proxies: proxyUrls,
    });
    const result = await restCnt.getPrice(symbolBtcSpot);
    console.log(result);
  });
});
