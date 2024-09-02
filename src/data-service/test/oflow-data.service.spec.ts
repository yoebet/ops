import { Test } from '@nestjs/testing';
import { wait } from '@/common/utils/utils';
import { DbModule } from '@/db/db-module';
import { CommonModule } from '@/common/common.module';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { MarketDataModule } from '@/data-service/market-data.module';
import { MarketDataService } from '@/data-service/market-data.service';

jest.setTimeout(1000_000);

describe('oflow-market-data', () => {
  let service: MarketDataService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemConfigModule, CommonModule, DbModule, MarketDataModule],
      providers: [MarketDataService],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(MarketDataService);
  });

  describe('query', () => {
    it('queryTrade', async () => {
      const result = await service.queryTicker({
        timeFrom: 1679440800000,
        ex: 'binance',
        symbol: 'BTC-PERP/USDT',
      });
      console.log(result);
      await wait(2_000);
    });

    it('queryKLine', async () => {
      const result = await service.queryOFlowKline({
        timeFrom: 1680537600000,
        timeTo: 1680624000001,
        ex: 'binance',
        symbol: 'BTC/USDT',
        interval: '1d',
      });
      console.log(result);
      await wait(2_000);
    });

    it('queryFootprint', async () => {
      const result = await service.queryOFlowFpKline({
        timeFrom: 1679440800000,
        ex: 'binance',
        symbol: 'BTC-PERP/USDT',
        exSymbols: [
          {
            ex: 'binance',
            symbols: ['BTC-PERP/USDT', 'BTC-PERP/BUSD'],
          },
          {
            ex: 'okx',
            symbols: ['BTC-PERP/USDT'],
          },
        ],
        interval: '30s',
        prl: 4,
      });
      console.log(result);
      await wait(2_000);
    });
  });
});
