import { wait } from '@/common/utils/utils';
import { OkxRest } from '@/exchange/okx/rest';
import { TestConfig } from '@/env.local.test';

const symbolBtcSpot = 'BTC-USDT';

jest.setTimeout(5000_000);

const proxyUrls = TestConfig.exchange.socksProxies;
const rest = new OkxRest({
  proxies: proxyUrls,
});

describe('REST', () => {
  it('spot', async () => {
    const result = await rest.getKlines({
      symbol: symbolBtcSpot,
      interval: '1m',
      limit: 10,
    });
    console.log(result);
  });

  it('spot 2', async () => {
    const result = await rest.getKlines({
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

  it('symbol info', async () => {
    const result = await rest.getSymbolInfo(symbolBtcSpot);
    console.log(result);
  });

  it('price', async () => {
    const result = await rest.getPrice(symbolBtcSpot);
    console.log(result);
  });
});
