import { Test } from '@nestjs/testing';
import { getTsNow, wait } from '@/common/utils/utils';
import { OFlowMarketDataService } from '@/oflow-server/services/oflow-market-data.service';
import { OflowServerModule } from '@/oflow-server/oflow-server.module';
import {
  BlockDataRequest,
  DataRequest,
  FPDataRequest,
  KlineDataRequest,
  LiveDataRequest,
  TickerDataRequest,
} from '@/oflow-server/commands';
import { OflowDataType } from '@/oflow-server/constants';
import { ExchangeCode } from '@/exchange/exchanges-types';

jest.setTimeout(200_000);

describe('oflowMarketSpec', () => {
  let service: OFlowMarketDataService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [OflowServerModule],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(OFlowMarketDataService);
  });

  it('fetchData-1', async () => {
    const dataRequest: DataRequest = {
      type: OflowDataType.footprint,
      params: {
        timeFrom: Date.now() - 8 * 60 * 60 * 1000,
        timeTo: Date.now(),
        ex: 'binance',
        symbol: 'BTC/USDT',
        interval: '15m',
        prl: 8,
      },
    };
    const result = await service.fetchData(dataRequest);
    console.log(result);
    await wait(20_000);
  });

  it('aggregateTrade()', async () => {
    const dataRequest: TickerDataRequest = {
      type: OflowDataType.ticker,
      params: {
        timeFrom: Date.now() - 8 * 60 * 60 * 1000,
        timeTo: Date.now(),
        ex: 'binance',
        symbol: 'BTC/USDT',
        aggFields: [
          { field: 'size', method: 'sum' },
          { field: 'amount', method: 'min' },
        ],
        groupFields: ['ts', 'ex'],
      },
    };
    const result = await service.fetchData(dataRequest);
    console.log(JSON.stringify(result));
    // await wait(20_000);
  });

  it('aggregateKLine()', async () => {
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

  it('LastFPKLine()', async () => {
    const dataRequest: LiveDataRequest = {
      type: OflowDataType.footprint,
      floorInv: '1h',
      params: {
        interval: '1d',
        prl: 32,
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

  it('aggregateFootprint()', async () => {
    const dataRequest: DataRequest = {
      type: OflowDataType.footprint,
      params: {
        ex: 'e',
        symbol: 's1',
        exSymbols: [
          {
            ex: 'okx',
            symbols: ['BTC-PERP/BTC', 'BTC-PERP/USDT', 'BTC/USDT'],
          },
        ],
        baseCoin: 'BTC',
        interval: '30s',
        prl: 8,
        timeFrom: Date.now() - 8 * 60 * 60 * 1000,
        timeTo: Date.now(),
      },
    };
    const result = await service.fetchData(dataRequest);
    console.log(result);
    // await wait(20_000);
  });

  it('FetchBlock()', async () => {
    const dataRequest: DataRequest = {
      type: OflowDataType.block,
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
        timeFrom: Date.now() - 8 * 60 * 60 * 1000,
        type: 'SIZE',
        slices: [{ field: 'size', range: [5, undefined] }],
        limit: 100,
      },
    };
    const result = await service.fetchData(dataRequest);
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
          { field: 'btds', method: 'sum' },
          { field: 'ba', method: 'sum' },
          { field: 'bs', method: 'sum' },
          { field: 'stds', method: 'sum' },
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
          { field: 'btds', method: 'sum' },
          { field: 'ba', method: 'sum' },
          { field: 'bs', method: 'sum' },
          { field: 'stds', method: 'sum' },
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

  it('aggregateBlockGroupByDatePart()', async () => {
    const tsNow = getTsNow();
    const dataRequest: BlockDataRequest = {
      type: OflowDataType.block,
      params: {
        timeFrom: tsNow - 1000 * 60 * 60 * 24 * 90,
        timeTo: tsNow,
        type: 'AMOUNT',
        ex: 'binance',
        symbol: 'BTC/USDT',
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
        rangeGroup: {
          field: 'partId',
          name: 'blockType',
          divides: [2, 5, 20],
        },
        aggFields: [
          { field: 'tds', method: 'sum' },
          { field: 'size', method: 'sum' },
          { field: 'amount', method: 'sum' },
          { field: 'btds', method: 'sum' },
          { field: 'bs', method: 'sum' },
          { field: 'ba', method: 'sum' },
          { field: 'stds', method: 'sum' },
          { field: 'ss', method: 'sum' },
          { field: 'sa', method: 'sum' },
        ],
        groupFields: ['ts'],
      },
    };
    const result = await service.fetchData(dataRequest);
    console.log(result);
    // await wait(20_000);
  });

  it('aggregateBlockGroupByExSymbol()', async () => {
    const dataRequest: BlockDataRequest = {
      type: OflowDataType.block,
      params: {
        timeFrom: Date.now() - 1000 * 60 * 60 * 24 * 90,
        timeTo: undefined,
        type: 'AMOUNT',
        ex: 'binance',
        symbol: 'BTC/USDT',
        // exSymbols: [
        //   {
        //     ex: 'binance',
        //     symbols: ['BTC/USDT', 'BTC-PERP/USDT'],
        //   },
        //   {
        //     ex: 'okx',
        //     symbols: ['BTC/USDT', 'BTC-PERP/USDT'],
        //   },
        // ],
        rangeGroup: {
          field: 'partId',
          name: 'pid',
          divides: [5, 20],
        },
        aggFields: [
          { field: 'tds', method: 'sum' },
          { field: 'size', method: 'sum' },
          { field: 'amount', method: 'sum' },
          { field: 'bc', method: 'sum' },
          { field: 'bs', method: 'sum' },
          { field: 'ba', method: 'sum' },
          { field: 'sc', method: 'sum' },
          { field: 'ss', method: 'sum' },
          { field: 'sa', method: 'sum' },
        ],
        groupFields: ['symbol', 'ex'],
      },
    };
    const result = await service.fetchData(dataRequest);
    console.log(result);
    // await wait(20_000);
  });

  it('fetchTicker', async () => {
    const dataRequest: TickerDataRequest = {
      type: OflowDataType.ticker,
      params: {
        timeFrom: Date.now() - 24 * 60 * 60 * 1000,
        timeTo: Date.now(),
        ex: 'binance',
        symbol: 'BTC/USDT',
        exSymbols: [
          {
            ex: 'binance',
            symbols: ['BTC/USDT'],
          },
        ],
        limit: 10,
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

  it('fetchKLineFP', async () => {
    const dataRequest: FPDataRequest = {
      type: OflowDataType.footprint,
      params: {
        // timeFrom: Date.now() - 24 * 60 * 60 * 1000,
        // timeTo: Date.now(),
        // interval: '1h',
        // prl: 64,
        // ex: 'binance',
        // symbol: 'BTC/USDT',
        // exSymbols: [
        //   {
        //     ex: 'binance',
        //     symbols: ['BTC/BUSD', 'BTC/USDT'],
        //   },
        // ],
        ex: 'kucoin',
        symbol: 'ETH/USDT',
        baseCoin: 'ETH',
        interval: '1s',
        prl: 8,
        timeFrom: 1725500699100,
        timeTo: 1725500702100,
        // timeFromStr: '2024-09-05T01:44:59.100Z',
        // timeToStr: '2024-09-05T01:45:02.100Z',
      },
    };
    const result = await service.fetchData(dataRequest);
    console.log(result);
    // await wait(20_000);
  });
});
