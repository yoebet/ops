import { Test } from '@nestjs/testing';
import { DbModule } from '@/db/db-module';
import { CommonModule } from '@/common/common.module';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { MarketDataModule } from '@/data-service/market-data.module';
import { KlineDataService } from '@/data-service/kline-data.service';
import { Kline } from '@/db/models-data/kline';

jest.setTimeout(1000_000);

describe('load-kline-data', () => {
  let service: KlineDataService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemConfigModule, CommonModule, DbModule, MarketDataModule],
      providers: [KlineDataService],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(KlineDataService);
  });

  it('save', async () => {
    const klines: Kline[] = [
      {
        amount: 0,
        ba: 0,
        base: '',
        bc: 0,
        bs: 0,
        close: 0,
        ex: 'binance',
        market: 'spot',
        high: 0,
        interval: '15m',
        low: 0,
        open: 0,
        quote: '',
        sa: 0,
        sc: 0,
        size: 0,
        ss: 0,
        symbol: 'BTC/USDT',
        tds: 0,
        time: new Date('2024-10-31 00:00:00 +00:00'),
      },
    ];
    await service.saveKlines('15m', klines);
  });

  it('save update', async () => {
    const klines: Kline[] = [
      {
        amount: 8.8,
        ba: 1,
        base: 'HH',
        bc: 9,
        bs: 2,
        close: 9,
        ex: 'binance',
        high: 10,
        interval: '15m',
        low: 8.1,
        open: 7.2,
        quote: 'USDT',
        sa: 3,
        sc: 1,
        size: 1.1,
        ss: 33,
        market: 'spot',
        symbol: 'BTC/USDT',
        tds: 20,
        time: new Date('2024-10-31 00:00:00 +00:00'),
      },
    ];
    await service.saveKlines('15m', klines, { updateOnConflict: true });
  });
});
