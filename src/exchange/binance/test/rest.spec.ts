import { TestConfig } from '@/env.local.test';
import { BinanceSpotRest } from '@/exchange/binance/rest-spot';

const symbol_BTC_USDT = 'BTCUSDT';

const proxyUrls = TestConfig.exchange.socksProxies;
const rest = new BinanceSpotRest({ proxies: proxyUrls });

jest.setTimeout(5000_000);

describe('REST', () => {
  it('spot', async () => {
    const result = await rest.getKlines({
      symbol: symbol_BTC_USDT,
      interval: '1m',
      limit: 10,
    });
    console.log(result);
  });

  it('symbol info', async () => {
    const result = await rest.getSymbolInfo(symbol_BTC_USDT);
    console.log(result);
  });

  it('price', async () => {
    const result = await rest.getPrice(symbol_BTC_USDT);
    console.log(result);
  });
});
