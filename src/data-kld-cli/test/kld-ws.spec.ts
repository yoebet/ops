import { DataSource } from '../data-source';
import { DataScope, OflowDataChannel } from '../commands';
import { wait } from '@/common/utils/utils';
import { TestConfig } from '@/env.local.test';

jest.setTimeout(100_000);

const server = TestConfig.kld;

describe('kld-ws', () => {
  let oflowWs: DataSource;

  beforeAll(() => {
    oflowWs = new DataSource({
      debug: true,
      serverBase: server.base,
      wsPath: server.wsPath,
      // transports: ['polling'],
      accessToken: '',
    });
  });

  test('exchanges', async () => {
    const exchanges = await oflowWs.getExchanges();
    console.log(exchanges);
    await wait(5000);
  });

  test('fetch-klines', async () => {
    const klines = await oflowWs.fetchKlines({
      ex: 'okx',
      symbol: 'BTC/USDT',
      interval: '15m',
      timeFrom: Date.now() - 60 * 60 * 1000,
    });
    console.log(klines);
    await wait(5000);
  });

  test('get-latest-ticker', async () => {
    const tickers = await oflowWs.getLatestPrice({
      baseCoin: 'BTC',
      ex: 'binance',
      symbol: 'BTC/USDT',
    });
    console.log(tickers);
    await wait(5000);
  });

  test('get-live-kline', async () => {
    const klines = await oflowWs.getLiveKline({
      baseCoin: 'BTC',
      ex: 'binance',
      symbol: 'BTC/USDT',
      interval: '15m',
    });
    console.log(klines);
    await wait(5000);
  });

  test('agg-klines', async () => {
    const res = await oflowWs.aggregateKlines({
      ex: 'binance',
      symbol: 'BTC-USD',
      interval: '1h',
      timeFrom: 1673260628838,
      aggFields: [
        { field: 'sa', method: 'sum' },
        { field: 'ba', method: 'sum' },
      ],
      // groupFields: [],
    });
    console.log(res);
    await wait(5000);
  });

  test('agg-klines-direct', async () => {
    const res = await oflowWs.aggregateKlines({
      ex: 'binance',
      symbol: 'BTC/USDT',
      baseCoin: 'BTC',
      interval: '15s',
      timeFrom: 1678268025000,
      timeTo: 1678267410100,
      aggFields: ['sa', 'ss', 'ba', 'bs', 'tds', 'size', 'amount'],
      groupFields: ['ts', 'ex', 'symbol'],
    });
    console.log(res);
    await wait(5000);
  });

  test('sub-ticker', async () => {
    const params: DataScope = {
      baseCoin: 'LTC',
      ex: 'e',
      symbol: 's1',
      exSymbols: [
        {
          ex: 'binance',
          symbols: [/*'LTC/BUSD', */ 'LTC/USDT'],
        },
        // {
        //   ex: 'okx',
        //   symbols: ['LTC/USDT'],
        // },
      ],
      throttle: 200,
    };
    oflowWs.logBelow1s = true;
    const obs = await oflowWs.subscribeTicker(params);
    obs.subscribe(() => {});

    await wait(120_000);

    await oflowWs.unsubscribe(OflowDataChannel.ticker, params);

    await wait(50_000);
  });

  test('sub-kline', async () => {
    const params: DataScope = {
      ex: 'okx',
      symbol: 'BTC/USDT',
      interval: '1s',
    };
    const obs = await oflowWs.subscribeKline(params);
    obs.subscribe(console.log);

    await wait(20_000);

    await oflowWs.unsubscribe(OflowDataChannel.kline, params);

    await wait(50_000);
  });
});
