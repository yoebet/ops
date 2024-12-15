import { Test } from '@nestjs/testing';
import { CommonServicesModule } from '@/common-services/common-services.module';
import { ExchangeCode } from '@/db/models/exchange-types';
import { KlineDataService } from '@/data-service/kline-data.service';
import { MarketDataModule } from '@/data-service/market-data.module';
import { BacktestKlineLevelsData } from '@/strategy-backtest/backtest-kline-levels-data';
import { TimeLevel } from '@/db/models/time-level';
import { DateTime, DateTimeOptions } from 'luxon';
import { MINUTE_MS } from '@/common/utils/utils';
import { BacktestKlineData } from '@/strategy-backtest/backtest-kline-data';

jest.setTimeout(60 * MINUTE_MS);

const DateTimeOpts: DateTimeOptions = { zone: 'UTC' };

describe('backtest kline data', () => {
  let klineDataService: KlineDataService;
  let kld: BacktestKlineLevelsData;

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

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CommonServicesModule, MarketDataModule],
    }).compile();
    await moduleRef.init();
    klineDataService = moduleRef.get(KlineDataService);

    kld = new BacktestKlineLevelsData(
      klineDataService,
      ex,
      symbol,
      TimeLevel.TL1mTo1d.slice(3),
      startDateTime,
      endDateTime,
      10,
      10,
    );
  });

  it('kline-data 0', async () => {
    const kld = new BacktestKlineData(
      klineDataService,
      ex,
      symbol,
      TimeLevel.TL1mTo1d.slice(-1)[0],
      startDateTime,
      10,
      10,
    );

    const timeTo = endDateTime.toMillis();

    while (true) {
      const kl = await kld.getKline();
      console.log(`${kl.time.toISOString()} ${kl.open}`);
      kld.rollTimeInterval();
      if (kld.getTimeTs() > timeTo) {
        break;
      }
    }
  });

  it('kline-data', async () => {
    // const prevKls = await kld.getKlinesTillNow('1m', 5);
    // console.log(prevKls);
    // kld.resetHighestLevel();
    while (true) {
      // const kls = await kld.getKlinesInUpperLevel();
      // console.log(
      //   kls.map((kl) => `${kl.time.toISOString()} ${kl.interval} ${kl.open}`),
      // );
      const tl = kld.getCurrentLevel();
      const h = `${tl.interval} ::`;
      const kl = await kld.getKline();
      if (kl) {
        console.log(`${h} ${kl.time.toISOString()} ${kl.open}`);
      } else {
        console.log(`${h} - missing`);
      }
      const moved = kld.moveOn();
      if (!moved) {
        break;
      }
    }
  });

  it('kline-data - roll lowest', async () => {
    while (true) {
      const hasNext = kld.moveOnLowestLevel();
      if (!hasNext) {
        break;
      }
      const kl = await kld.getKline();
      const { interval } = kld.getCurrentLevel();
      const h = `${interval} ::`;
      if (kl) {
        console.log(`${h} ${kl.time.toISOString()} ${kl.open}`);
      } else {
        console.log(`${h} missing`);
      }
      // const tss = timeCursor.toISO();
      // console.log(`cursor: ${tss}`);
      if (!hasNext) {
        break;
      }
    }
  });
});
