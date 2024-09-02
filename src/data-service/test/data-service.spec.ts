import { Test } from '@nestjs/testing';
import { MarketDataService } from '@/data-service/market-data.service';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { DbModule } from '@/db/db-module';
import { wait } from '@/common/utils/utils';
import { MarketDataModule } from '@/data-service/market-data.module';
import { Trade1 } from '@/data-service/models/trade1';
import { TradeSide } from '@/db/models-data/base';
import { Trade } from '@/db/models/trade';
import { ExchangeCode } from '@/exchange/exchanges-types';
import { And, LessThan, MoreThan } from 'typeorm';

jest.setTimeout(500_000);

describe('market-data', () => {
  let service: MarketDataService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemConfigModule, DbModule, MarketDataModule],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(MarketDataService);
  });

  describe('query', () => {
    it('saveTrades', async () => {
      const trades = [
        {
          time: new Date('2024-08-29 07:11:35.033000 +00:00'),
          symbol: 'DOGE-PERP/USDT',
          ex: 'bybit',
          tradeId: '1ff135f2-1a2b-554c-bc8f-f1ab52c81767',
          price: 0.10096,
          size: 100,
          amount: 10.096,
          side: TradeSide.sell,
          dataId: 516427,
          csize: 100,
          block: 0,
        },
        {
          time: new Date('2024-08-29 07:11:35.024000 +00:00'),
          symbol: 'SOL-PERP/USDT',
          ex: 'bybit',
          tradeId: 'f443e259-79c3-5532-96ea-59cdada94e67',
          price: 144.64,
          size: 0.7,
          amount: 101.248,
          side: TradeSide.buy,
          dataId: 516426,
          csize: 0.7,
          block: 0,
        },
      ] as Trade1[];
      const result = await service.saveTrades(trades);
      console.log(result);
    });

    it('find next one trade', async () => {
      const idTime = await service.findNextTrade({
        ex: ExchangeCode.okx,
        symbol: 'BTC/USDT',
        tradeTs: new Date('2024-08-31 09:02:48.183000 +00:00').getTime(),
      });
      console.log(idTime);
    });

    it('find previous one trade', async () => {
      const idTime = await service.findPreviousTrade({
        ex: ExchangeCode.okx,
        symbol: 'BTC/USDT',
        tradeTs: new Date('2024-08-31T09:02:48.203Z').getTime(),
      });
      console.log(idTime);
    });

    it('queryLastTrade', async () => {
      const result = await service.queryLastTrade({ symbols: [] });
      console.log(result);
      await wait(2_000);
    });

    it('queryTrade', async () => {
      const result = await service.queryTrades({
        tsFrom: 1679440800000,
        symbols: [
          { symbol: 'BTC-PERP/USDT', ex: 'binance' },
          { symbol: 'BTC-PERP/USDT', ex: 'okx' },
        ],
        limit: 10,
      });
      console.log(result);
      console.log(result.length);
      await wait(2_000);
    });

    it('queryBlockList', async () => {
      const result = await service.queryBlockList({
        tsFrom: 1679440800000,
        symbols: [
          { symbol: 'BTC-PERP/USDT', ex: 'binance' },
          { symbol: 'BTC-PERP/USDT', ex: 'okx' },
        ],
        limit: 10,
        slices: [
          {
            field: 'size',
            range: [5, undefined],
          },
        ],
      });
      console.log(result);
      console.log(result.length);
      await wait(2_000);
    });

    it('queryLastKLine', async () => {
      const result = await service.queryLastKLine({
        symbols: [{ symbol: 'BTC/USDT', ex: 'okx' }],
        timeInterval: '15m',
        // floorInv: '1m',
        zipSymbols: true,
      });
      console.log(result);
      await wait(2_000);
    });

    it('queryLastKLine-ms', async () => {
      const result = await service.queryLastKLine({
        symbols: [
          { symbol: 'BTC-PERP/USDT', ex: 'binance' },
          { symbol: 'BTC-PERP/USDT', ex: 'okx' },
        ],
        zipSymbols: true,
        timeInterval: '1h',
        floorInv: '1m',
      });
      console.log(result);
      await wait(2_000);
    });

    it('queryLastFootPrint', async () => {
      const result = await service.queryLastFootPrint({
        symbols: [{ symbol: 'BTC/USDT', ex: 'okx' }],
        timeInterval: '1d',
        floorInv: '1h',
        prl: 128,
        ts: 1724142600000,
      });
      console.log(result);
      await wait(2_000);
    });

    it('queryLastFootPrint-ms', async () => {
      const result = await service.queryLastFootPrint({
        symbols: [
          { symbol: 'BTC-PERP/USDT', ex: 'binance' },
          { symbol: 'BTC-PERP/USDT', ex: 'okx' },
        ],
        timeInterval: '1d',
        floorInv: '1h',
        prl: 128,
        ts: 1724142600000,
      });
      console.log(result);
      await wait(2_000);
    });

    it('queryLastFootPrint-ms-large-prl', async () => {
      const result = await service.queryLastFootPrint({
        symbols: [
          { symbol: 'BTC-PERP/USDT', ex: 'binance' },
          { symbol: 'BTC-PERP/USDT', ex: 'okx' },
        ],
        timeInterval: '1d',
        floorInv: '1h',
        prl: 512,
        ts: 1724142600000,
      });
      console.log(result);
      await wait(2_000);
    });

    it('queryLastFootPrint-no-floorInv', async () => {
      const result = await service.queryLastFootPrint({
        symbols: [{ symbol: 'BTC/USDT', ex: 'okx' }],
        timeInterval: '1d',
        prl: 128,
        ts: 1724142600000,
      });
      console.log(result);
      await wait(2_000);
    });

    it('queryKLine', async () => {
      const result = await service.queryKLines({
        tsFrom: 1681816440000,
        //tsTo: 1680652800000,
        symbols: [{ symbol: 'BTC/USDT', ex: 'okx' }],
        timeInterval: '1m',
        limit: 10,
      });
      console.log(result);
      await wait(2_000);
    });

    it('queryKLine-ms', async () => {
      const result = await service.queryKLines({
        tsFrom: new Date(Date.now() - 60 * 60 * 1000).getTime(),
        //tsTo: 1680652800000,
        symbols: [
          { symbol: 'BTC-PERP/USDT', ex: 'binance' },
          { symbol: 'BTC-PERP/USDT', ex: 'okx' },
        ],
        timeInterval: '15m',
        limit: 10,
        noLive: true,
      });
      console.log(result);
      await wait(2_000);
    });

    it('queryFootprint', async () => {
      const result = await service.queryFootprint({
        tsFrom: 1680566400000,
        // tsTo: 1680652800000,
        symbols: [],
        timeInterval: '1d',
        prl: 512,
      });
      console.log(result);
      await wait(2_000);
    });

    it('queryKLineFootprint', async () => {
      const result = await service.queryFpKLine({
        tsFrom: 1725501649000,
        tsTo: 1725501650000,
        symbols: [{ ex: 'binance', symbol: 'BTC/USDT' }],
        timeInterval: '1s',
        prl: 8,
        limit: 5,
      });
      console.log(result);
      await wait(2_000);
    });
  });
});
