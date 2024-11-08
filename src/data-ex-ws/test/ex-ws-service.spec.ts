import { Test } from '@nestjs/testing';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { ExWsModule } from '@/data-ex-ws/ex-ws.module';
import { ExWsService } from '@/data-ex-ws/ex-ws.service';
import { ExchangeCode } from '@/db/models/exchange-types';
import { wait } from '@/common/utils/utils';

jest.setTimeout(500_000);

describe('ex-ws-service', () => {
  let service: ExWsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemConfigModule, ExWsModule],
      providers: [],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(ExWsService);
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

    await wait(60 * 60 * 1000);
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

    await wait(60 * 60 * 1000);
  });
});
