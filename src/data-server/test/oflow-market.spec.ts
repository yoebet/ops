import { Test } from '@nestjs/testing';
import { wait } from '@/common/utils/utils';
import { DataQueryService } from '@/data-server/services/data-query.service';
import { DataServerModule } from '@/data-server/data-server.module';
import {
  DataRequest,
  KlineDataRequest,
  LiveDataRequest,
} from '@/data-server/commands';
import { OflowDataType } from '@/data-server/constants';
import { ExchangeCode } from '@/exchange/exchanges-types';

jest.setTimeout(200_000);

describe('oflowMarketSpec', () => {
  let service: DataQueryService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DataServerModule],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(DataQueryService);
  });

  it('aggregateKLine', async () => {
    const dataRequest: DataRequest = {
      type: OflowDataType.kline,
      params: {
        ex: 'e',
        symbol: 's1',
        exSymbols: [
          {
            ex: 'binance',
            symbols: ['BTC/USDT'],
          },
        ],
        baseCoin: 'BTC',
        interval: '1D',
        timeFrom: Date.now() - 24 * 60 * 60 * 1000,
        timeTo: Date.now(),
        aggFields: [
          { field: 'bs', method: 'sum', name: 'bid' },
          { field: 'ss', method: 'sum', name: 'ask' },
        ],
      },
    };
    const result = await service.fetchData(dataRequest);
    console.log(result);
    await wait(10_000);
  });

  it('LastKLine()', async () => {
    const dataRequest: LiveDataRequest = {
      type: OflowDataType.kline,
      floorInv: '1h',
      params: {
        interval: '1d',
        ex: 'e',
        symbol: 's1',
        exSymbols: [
          {
            ex: 'okx',
            symbols: ['BTC-PERP/BTC', 'BTC-PERP/USDT', 'BTC/USDT'],
          },
        ],
        baseCoin: 'BTC',
      },
    };
    const result = await service.getLatest(dataRequest);
    console.log(result);
    await wait(10_000);
  });

  it('LastTrade()', async () => {
    const dataRequest: LiveDataRequest = {
      type: OflowDataType.ticker,
      params: {
        ex: ExchangeCode.okx,
        symbol: 'BTC/USDT',
        baseCoin: 'BTC',
      },
    };
    const result = await service.getLatest(dataRequest);
    console.log(result);
    // await wait(20_000);
  });

  it('fetch-kline-group-by-ts', async () => {
    const dataRequest: DataRequest = {
      type: OflowDataType.kline,
      params: {
        ex: 'e',
        symbol: 's1',
        exSymbols: [
          {
            ex: 'binance',
            symbols: ['BTC/USDT', 'BTC-PERP/USDT'],
          },
          {
            ex: 'okx',
            symbols: ['BTC/USDT', 'BTC-PERP/USDT'],
          },
        ],
        baseCoin: 'BTC',
        interval: '1h',
        timeFrom: Date.now() - 24 * 60 * 60 * 1000 * 1000,
        // timeTo: Date.now(),
        aggFields: [
          { field: 'open' },
          { field: 'high' },
          { field: 'low' },
          { field: 'close' },
          { field: 'open_time' },
          { field: 'high_time' },
          { field: 'low_time' },
          { field: 'close_time' },
          { field: 'volume' },
          { field: 'vwap' },
          { field: 'sa', method: 'sum' },
          { field: 'ss', method: 'sum' },
          { field: 'bc', method: 'sum' },
          { field: 'ba', method: 'sum' },
          { field: 'bs', method: 'sum' },
          { field: 'sc', method: 'sum' },
          { field: 'tds', method: 'sum' },
          { field: 'size', method: 'sum' },
          { field: 'amount', method: 'sum' },
        ],
        groupFields: ['ts'],
      },
    };
    const result = await service.fetchData(dataRequest);
    console.log(result.length);
    // await wait(20_000);
  });

  it('fetch-kline-group-by-symbol', async () => {
    const dataRequest: DataRequest = {
      type: OflowDataType.kline,
      params: {
        ex: 'e',
        symbol: 's1',
        exSymbols: [
          {
            ex: 'binance',
            symbols: ['BTC/USDT', 'BTC-PERP/USDT'],
          },
          {
            ex: 'okx',
            symbols: ['BTC/USDT', 'BTC-PERP/USDT'],
          },
        ],
        baseCoin: 'BTC',
        interval: '1D',
        timeFrom: Date.now() - 24 * 60 * 60 * 1000,
        timeTo: Date.now(),
        aggFields: [
          { field: 'open' },
          { field: 'high' },
          { field: 'low' },
          { field: 'close' },
          { field: 'open_time' },
          { field: 'high_time' },
          { field: 'low_time' },
          { field: 'close_time' },
          { field: 'volume' },
          { field: 'vwap' },
          { field: 'sa', method: 'sum' },
          { field: 'ss', method: 'sum' },
          { field: 'bc', method: 'sum' },
          { field: 'ba', method: 'sum' },
          { field: 'bs', method: 'sum' },
          { field: 'sc', method: 'sum' },
          { field: 'tds', method: 'sum' },
          { field: 'size', method: 'sum' },
          { field: 'amount', method: 'sum' },
        ],
        groupFields: ['symbol'],
      },
    };
    const result = await service.fetchData(dataRequest);
    console.log(result);
    // await wait(20_000);
  });

  it('fetchKLine', async () => {
    const dataRequest: KlineDataRequest = {
      type: OflowDataType.kline,
      params: {
        timeFrom: Date.now() - 24 * 60 * 60 * 1000,
        timeTo: Date.now(),
        interval: '1m',
        ex: 'binance',
        symbol: 'BTC/USDT',
        exSymbols: [
          {
            ex: 'binance',
            symbols: ['BTC/USDT'],
          },
        ],
      },
    };
    const result = await service.fetchData(dataRequest);
    console.log(result);
    // await wait(20_000);
  });

  it('fetchKLine spot', async () => {
    const dataRequest: KlineDataRequest = {
      type: OflowDataType.kline,
      params: {
        ex: 'all',
        symbol: 'BTC/USDT',
        exSymbols: [
          {
            ex: 'binance',
            symbols: ['BTC/USDT'],
          },
          {
            ex: 'bitfinex',
            symbols: ['BTC/USD', 'BTC/USDT'],
          },
          {
            ex: 'bybit',
            symbols: ['BTC/USDT'],
          },
          { ex: 'coinbase', symbols: ['BTC/USD'] },
          { ex: 'kucoin', symbols: ['BTC/USDT'] },
          {
            ex: 'okx',
            symbols: ['BTC/USDT'],
          },
        ],
        baseCoin: 'BTC',
        interval: '1d', // 1h 4h 1d
        timeFrom: 1728129600000,
      },
    };
    const result = await service.fetchData(dataRequest);
    console.log(result);
    // await wait(20_000);
  });

  it('fetchKLine futures', async () => {
    const dataRequest: KlineDataRequest = {
      type: OflowDataType.kline,
      params: {
        ex: 'all',
        symbol: 'BTC-PERP/USDT',
        exSymbols: [
          {
            ex: 'binance',
            symbols: ['BTC-PERP/BTC', 'BTC-PERP/USDT'],
          },
          {
            ex: 'bitfinex',
            symbols: ['BTC-PERP/USDT'],
          },
          { ex: 'bitmex', symbols: ['BTC-PERP/BTC', 'BTC-PERP/USDT'] },
          {
            ex: 'bybit',
            symbols: ['BTC-PERP/BTC', 'BTC-PERP/USDT'],
          },
          { ex: 'kucoin', symbols: ['BTC-PERP/USDT'] },
          {
            ex: 'okx',
            symbols: ['BTC-PERP/BTC', 'BTC-PERP/USDT'],
          },
        ],
        baseCoin: 'BTC',
        interval: '1d',
        timeFrom: 1728129600000,
      },
    };
    const result = await service.fetchData(dataRequest);
    console.log(result);
    // await wait(20_000);
  });
});
