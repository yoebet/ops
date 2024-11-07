import { Test } from '@nestjs/testing';
import { KlineDataService } from '@/data-service/kline-data.service';
import { CommonServicesModule } from '@/common-services/common-services.module';
import { DbModule } from '@/db/db-module';
import { DAY_MS, HOUR_MS, MINUTE_MS, wait } from '@/common/utils/utils';
import { MarketDataModule } from '@/data-service/market-data.module';

jest.setTimeout(500_000);

describe('kline-data', () => {
  let service: KlineDataService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CommonServicesModule, DbModule, MarketDataModule],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(KlineDataService);
  });

  describe('query', () => {
    it('queryKLine', async () => {
      const result = await service.queryKLines2({
        tsFrom: Date.now() - 30 * MINUTE_MS,
        //tsTo: 1680652800000,
        symbols: [{ symbol: 'BTC/USDT', ex: 'okx' }],
        interval: '1m',
        limit: 10,
      });
      console.log(result);
      await wait(2_000);
    });

    it('queryKLine-ms', async () => {
      const result = await service.queryKLines2({
        tsFrom: Date.now() - HOUR_MS,
        //tsTo: 1680652800000,
        symbols: [
          { symbol: 'BTC-PERP/USDT', ex: 'binance' },
          { symbol: 'BTC-PERP/USDT', ex: 'okx' },
        ],
        interval: '15m',
        limit: 10,
      });
      console.log(result);
      await wait(2_000);
    });

    it('queryExSymbolKLines', async () => {
      const result = await service.queryKLines({
        tsFrom: Date.now() - 60 * DAY_MS,
        tsTo: Date.now(),
        symbol: 'BTC/USDT',
        ex: 'okx',
        interval: '1d',
        limit: 10,
      });
      console.log(result);
    });
  });
});
