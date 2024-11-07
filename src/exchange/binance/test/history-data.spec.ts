import { TestConfig } from '@/env.local.test';
import { BinanceHistoryDataLoader } from '@/exchange/binance/history-data-loader';
import * as AdmZip from 'adm-zip';

const proxyUrls = TestConfig.exchange.socksProxies;

const symbol_BTC_USDT = 'BTCUSDT';

jest.setTimeout(5000_000);

describe('loader', () => {
  const loader = new BinanceHistoryDataLoader(proxyUrls);

  it('download monthly', async () => {
    const rows = await loader.downloadKlineFile({
      tradingType: 'spot',
      timePeriod: 'monthly',
      dateStr: '2024-09',
      symbol: symbol_BTC_USDT,
      interval: '1m',
      saveZip: true,
      saveFile: true,
    });
    console.log(rows[0]);
  });

  it('download monthly 2', async () => {
    const rows = await loader.downloadKlineFile({
      tradingType: 'spot',
      timePeriod: 'monthly',
      dateStr: '2024-09',
      symbol: symbol_BTC_USDT,
      interval: '1mo',
      saveZip: true,
      saveFile: true,
    });
    console.log(rows[0]);
  });

  it('download daily', async () => {
    const rows = await loader.downloadKlineFile({
      tradingType: 'um',
      timePeriod: 'daily',
      dateStr: '2024-10-31',
      symbol: symbol_BTC_USDT,
      interval: '1h',
      // saveZip: true,
      saveFile: true,
    });
    console.log(rows[0]);
  });

  it('download daily cm', async () => {
    const rows = await loader.downloadKlineFile({
      tradingType: 'cm',
      timePeriod: 'daily',
      dateStr: '2024-10-31',
      symbol: 'BTCUSD_PERP',
      interval: '1h',
      // saveZip: true,
      saveFile: true,
    });
    console.log(rows[0]);
  });

  it('unzip', async () => {
    const zip = new AdmZip(
      'data/binance/spot/BTCUSDT/1m/BTCUSDT-1m-2024-09.zip',
    );
    // zip.extractAllTo(saveDir);

    // zip.forEach((entry) => {
    //   console.log(entry.entryName);
    //   const content = String(entry.getData());
    //   console.log(content);
    // });

    const entry = zip.getEntry('BTCUSDT-1m-2024-09.csv');
    const content = String(entry.getData());
    console.log(content.split('\n')[0]);
  });

  it('loadKlines', async () => {
    const candles = await loader.loadHistoryKlinesByMonth({
      yearMonth: '2024-09',
      symbol: symbol_BTC_USDT,
      interval: '1m',
    });
    console.log(candles[0]);
  });
});
