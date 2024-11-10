import { TestConfig } from '@/env.local.test';
import { BinanceSpotMarginExchange } from '@/exchange/binance/spot-margin-exchange';

const symbol_BTC_USDT = 'BTCUSDT';

const proxyUrls = TestConfig.exchange.socksProxies;
const exchange = new BinanceSpotMarginExchange({ proxies: proxyUrls });

jest.setTimeout(5000_000);

describe('REST', () => {
  it('kline', async () => {
    const result = await exchange.getKlines({
      symbol: symbol_BTC_USDT,
      interval: '1m',
      limit: 10,
    });
    console.log(result);
  });

  it('symbol info', async () => {
    const result = await exchange.getSymbolInfo(symbol_BTC_USDT);
    console.log(result);
  });

  it('price', async () => {
    const result = await exchange.getPrice(symbol_BTC_USDT);
    console.log(result);
  });
});
