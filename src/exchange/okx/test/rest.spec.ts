import { wait } from '@/common/utils/utils';
import { OkxRest } from '@/exchange/okx/rest';
import { TestConfig } from '@/test/test-config.spec';

const symbolBtcSpot = 'BTC-USDT';
const symbolEthSpot = 'ETH-USDT';

const symbolBtcUM = 'BTC-USDC-SWAP';
const symbolEthUM = 'ETH-USDC-SWAP';

const proxyUrls = [TestConfig.exchange.socksProxyUrl];

jest.setTimeout(5000_000);

describe('REST', () => {
  it('spot', async () => {
    const restCnt = new OkxRest({ proxies: proxyUrls });
    const result = await restCnt.getCandlesticks({
      symbol: symbolBtcSpot,
      interval: '1m',
    });
    console.log(result);
  });

  it('swap', async () => {
    const restCnt = new OkxRest({
      proxies: proxyUrls,
    });
    const result = await restCnt.getCandlesticks({
      symbol: symbolBtcUM,
      interval: '1m',
    });
  });

  it('history trade spot', async () => {
    const restCnt = new OkxRest({ proxies: proxyUrls });
    const result = await restCnt.getHistoryTrades({
      symbol: symbolBtcSpot,
      fromId: '390811128',
    });
    console.log(result);
  });

  it('history trade swap', async () => {
    const restCnt = new OkxRest({ proxies: proxyUrls });
    const result = await restCnt.getHistoryTrades({
      symbol: symbolBtcUM,
      fromId: '510379',
    });
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
});
