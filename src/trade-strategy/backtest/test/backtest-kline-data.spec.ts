import { Test } from '@nestjs/testing';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { ExchangeCode } from '@/db/models/exchange-types';
import { KlineDataService } from '@/data-service/kline-data.service';
import { MarketDataModule } from '@/data-service/market-data.module';
import { BacktestKlineData } from '@/trade-strategy/backtest/backtest-kline-data';
import { TimeLevel } from '@/db/models/time-level';
import { DateTime, DateTimeOptions } from 'luxon';
import { MINUTE_MS } from '@/common/utils/utils';

jest.setTimeout(60 * MINUTE_MS);

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
      '2024-07-03',
      'yyyy-MM-dd',
      DateTimeOpts,
    );

    const kld = new BacktestKlineData(
      klineDataService,
      ex,
      symbol,
      TimeLevel.TL1mTo1d.slice(3),
      startDateTime,
      endDateTime,
      10,
      10,
    );

    // const prevKls = await kld.getKlinesTillNow('1m', 5);
    // console.log(prevKls);
    // kld.resetHighestLevel();
    while (true) {
      // const kls = await kld.getKlinesInUpperLevel();
      // console.log(
      //   kls.map((kl) => `${kl.time.toISOString()} ${kl.interval} ${kl.open}`),
      // );
      const tl = kld.getCurrentLevel();
      console.log(`${tl.timeCursor.toISOTime()} ${tl.interval}`);
      const kl = await kld.getKline();
      if (kl) {
        console.log(`${kl.time.toISOString()} ${kl.open}`);
      } else {
        console.log(`- missing`);
      }
      const moved = kld.moveOrRollTime();
      if (!moved) {
        break;
      }
    }
  });
});
