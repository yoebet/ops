import { TestConfig } from '@/env.local.tset';
import { BinanceSpotRest } from '@/exchange/binance/rest-spot';

const proxyUrls = TestConfig.exchange.socksProxies;

const symbol_BTC_USDT = 'BTCUSDT';

jest.setTimeout(5000_000);

describe('REST', () => {
  it('spot', async () => {
    const rest = new BinanceSpotRest({ proxies: proxyUrls });
    const result = await rest.getKlines({
      symbol: symbol_BTC_USDT,
      interval: '1m',
      limit: 10,
    });
    console.log(result);
  });

  it('trade spot', async () => {
    const rest = new BinanceSpotRest({ proxies: proxyUrls });
    const result = await rest.getTrades({
      symbol: symbol_BTC_USDT,
      limit: 20,
    });
    console.log(result);
  });

  it('history trade spot', async () => {
    const rest = new BinanceSpotRest({ proxies: proxyUrls });
    const result = await rest.getHistoryTrades({
      symbol: symbol_BTC_USDT,
      fromId: '3773812792',
      limit: 10,
    });
    console.log(result);
  });
});
