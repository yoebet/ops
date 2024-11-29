import { Test } from '@nestjs/testing';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { ExchangeCode } from '@/db/models/exchange-types';
import { KlineDataService } from '@/data-service/kline-data.service';
import { MarketDataModule } from '@/data-service/market-data.module';
import { BacktestKlineData } from '@/trade-strategy/backtest/backtest-kline-data';
import { TimeLevel } from '@/db/models/time-level';
import { DateTime, DateTimeOptions } from 'luxon';

jest.setTimeout(60_000);

const DateTimeOpts: DateTimeOptions = { zone: 'UTC' };

describe('backtest kline data', () => {
  let klineDataService: KlineDataService;
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemConfigModule, MarketDataModule],
    }).compile();
    await moduleRef.init();
    klineDataService = moduleRef.get(KlineDataService);
  });

  it('kline-data', async () => {
    const symbol = 'BTC/USDT';
    const ex = ExchangeCode.binance;

    const startDateTime = DateTime.fromFormat(
      '2024-07-02',
      'yyyy-MM-dd',
      DateTimeOpts,
    );
    const endDateTime = DateTime.fromFormat(
      '2024-07-31',
      'yyyy-MM-dd',
      DateTimeOpts,
    );

    const kld = new BacktestKlineData(
      klineDataService,
      ex,
      symbol,
      TimeLevel.TL1mTo1d,
      startDateTime,
      endDateTime,
      10,
      10,
    );

    kld.resetHighestLevel();
    const prevKls = await kld.getKlinesTillNow('1m', 5);
    console.log(prevKls);
    while (true) {
      const kls = await kld.getKlines();
      console.log(kls);
      if (!kld.moveDownLevel()) {
        break;
      }
    }
  });
});
