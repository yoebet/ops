import { Test } from '@nestjs/testing';
import { KlineDataService } from '@/data-service/kline-data.service';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { DbModule } from '@/db/db-module';
import { wait } from '@/common/utils/utils';
import { MarketDataModule } from '@/data-service/market-data.module';

jest.setTimeout(500_000);

describe('kline-data', () => {
  let service: KlineDataService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemConfigModule, DbModule, MarketDataModule],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(KlineDataService);
  });

  describe('query', () => {
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
  });
});
