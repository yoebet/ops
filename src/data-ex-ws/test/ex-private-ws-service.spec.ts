import { Test } from '@nestjs/testing';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { ExWsModule } from '@/data-ex-ws/ex-ws.module';
import { ExchangeCode, ExTradeType } from '@/db/models/exchange-types';
import { wait } from '@/common/utils/utils';
import { ExPrivateWsService } from '@/data-ex-ws/ex-private-ws.service';
import { TestConfig } from '@/env.local.test';

jest.setTimeout(500_000);

const { testApiKeys: apiKeys } = TestConfig.exchange;

const apiKey = apiKeys[ExchangeCode.okx];

describe('ex-private-ws-service', () => {
  let service: ExPrivateWsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemConfigModule, ExWsModule],
      providers: [],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(ExPrivateWsService);
  });

  it('sub order', async () => {
    const { obs, unsubs } = await service.subscribeExOrder(
      apiKey,
      ExchangeCode.okx,
      ExTradeType.spot,
    );
    obs.subscribe(console.log);

    await wait(30 * 1000);
    unsubs();
    await wait(30 * 1000);
  });

  it('sub order - ms', async () => {
    const clis = 6;
    for (let i = 0; i < clis; i++) {
      const { obs, unsubs } = await service.subscribeExOrder(
        apiKey,
        ExchangeCode.okx,
        ExTradeType.spot,
      );
      const s = obs.subscribe((so) => console.log(`#${i}: ${so.rawOrder}`));
      setTimeout(
        () => {
          unsubs();
          s.unsubscribe();
          console.log(`#${i}: unsub`);
        },
        (i + 1) * 5 * 1000,
      );
    }

    await wait(60 * 60 * 1000);
  });

  it('sub for order', async () => {
    const obs = service.subscribeForOrder(
      apiKey,
      ExchangeCode.okx,
      ExTradeType.spot,
      { exOrderId: '1234' },
    );
    obs.subscribe(console.log);

    await wait(30 * 1000);
  });
});
