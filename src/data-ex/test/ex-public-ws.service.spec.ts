import { Test } from '@nestjs/testing';
import { CommonServicesModule } from '@/common-services/common-services.module';
import { ExDataModule } from '@/data-ex/ex-data.module';
import { ExPublicWsService } from '@/data-ex/ex-public-ws.service';
import { ExchangeCode } from '@/db/models/exchange-types';
import { HOUR_MS, wait } from '@/common/utils/utils';

jest.setTimeout(500_000);

describe('ex-public-ws-service', () => {
  let service: ExPublicWsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CommonServicesModule, ExDataModule],
      providers: [],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(ExPublicWsService);
  });

  it('sub btc price', async () => {
    const { obs, unsubs } = await service.subscribeRtPrice(
      ExchangeCode.okx,
      'BTC/USDT',
    );
    obs.subscribe(console.log);

    await wait(30 * 1000);
    unsubs();
    await wait(30 * 1000);
  });

  it('sub btc price - ms', async () => {
    const coins = ['BTC', 'ETH'];
    const clis = 6;
    for (let i = 0; i < clis; i++) {
      const coin = coins[i % coins.length];
      const { obs, unsubs } = await service.subscribeRtPrice(
        ExchangeCode.binance,
        `${coin}/USDT`,
      );
      const s = obs.subscribe((rp) =>
        console.log(`#${i} ${coin}: ${rp.price}`),
      );
      setTimeout(
        () => {
          unsubs();
          s.unsubscribe();
          console.log(`#${i} ${coin}: unsub`);
        },
        (i + 1) * 5 * 1000,
      );
    }

    await wait(HOUR_MS);
  });

  it('watch price', async () => {
    const result = await service.watchRtPrice(ExchangeCode.okx, 'BTC/USDT', {
      lowerBound: 91600,
      upperBound: 91700,
      timeoutSeconds: 5 * 60,
    });
    console.log(result);
  });

  it('sub btc kline 1s', async () => {
    const { obs, unsubs } = await service.subscribeRtKline(
      ExchangeCode.binance,
      'BTC/USDT',
      '1s',
    );
    obs.subscribe(console.log);

    await wait(30 * 1000);
    unsubs();
    await wait(30 * 1000);
  });

  it('sub btc kline 1s - ms', async () => {
    const coins = ['BTC', 'ETH'];
    const clis = 6;
    for (let i = 0; i < clis; i++) {
      const coin = coins[i % coins.length];
      const { obs, unsubs } = await service.subscribeRtKline(
        ExchangeCode.binance,
        `${coin}/USDT`,
        '1s',
      );
      const s = obs.subscribe((kl) =>
        console.log(`#${i} ${coin}: ${kl.close}`),
      );
      setTimeout(
        () => {
          unsubs();
          s.unsubscribe();
          console.log(`#${i} ${coin}: unsub`);
        },
        (i + 1) * 5 * 1000,
      );
    }

    await wait(HOUR_MS);
  });
});
