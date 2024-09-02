import { wait } from '@/common/utils/utils';
import { TestConfig } from '@/test/test-config.spec';
import { BinanceSpotRest } from '@/exchange/binance/rest-spot';
import { BinanceUsdMRest } from '@/exchange/binance/rest-usdsm';
import { BinanceCoinMRest } from '@/exchange/binance/rest-coinm';

const proxyUrls = [TestConfig.exchange.socksProxyUrl];

const symbol_BTC_USDT = 'BTCUSDT';
const symbol_BTC_PERP_USDT = 'BTCUSDT';
const symbol_BTC_PERP_BTC = 'BTCUSD_PERP';

jest.setTimeout(5000_000);

describe('REST', () => {
  it('spot', async () => {
    const rest = new BinanceSpotRest({ proxies: proxyUrls });
    const result = await rest.getCandlesticks({
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

  it('coinm-rest', async () => {
    const rest = new BinanceCoinMRest({
      proxies: proxyUrls,
    });
    // const result = await rest.getCandlesticks({
    //   symbol: symbol_BTC_PERP_BTC,
    //   limit: 20,
    // });
    // const result = await rest.getTrades({
    //   symbol: symbol_BTC_PERP_BTC,
    //   limit: 20,
    // });
    // need Api key
    const result = await rest.getHistoryTrades({
      symbol: symbol_BTC_PERP_BTC,
      limit: 20,
    });
    console.log(result);
  });

  it('usdm-rest', async () => {
    const rest = new BinanceUsdMRest({
      proxies: proxyUrls,
    });
    // need api key
    // const result = await rest.getCandlesticks({
    //   symbol: symbol_BTC_PERP_USDT,
    //   interval: '1m',
    //   limit: 10,
    // });
    const result = await rest.getTrades({
      symbol: symbol_BTC_PERP_USDT,
      limit: 20,
    });
    console.log(result);
  });
});
