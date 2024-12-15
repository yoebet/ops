import { Test } from '@nestjs/testing';
import { CommonServicesModule } from '@/common-services/common-services.module';
import { ExDataModule } from '@/data-ex/ex-data.module';
import { ExPublicWsService } from '@/data-ex/ex-public-ws.service';
import { ExchangeCode } from '@/db/models/exchange-types';
import { wait } from '@/common/utils/utils';
import { ExPublicDataService } from '@/data-ex/ex-public-data.service';

jest.setTimeout(500_000);

describe('ex-public-data-service', () => {
  let wsDataService: ExPublicWsService;
  let service: ExPublicDataService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CommonServicesModule, ExDataModule],
      providers: [],
    }).compile();

    await moduleRef.init();
    wsDataService = moduleRef.get(ExPublicWsService);
    service = moduleRef.get(ExPublicDataService);
  });

  it('get lastPrice', async () => {
    const ex = ExchangeCode.okx;
    const symbol = 'BTC/USDT';
    const { obs, unsubs } = await wsDataService.subscribeRtPrice(ex, symbol);
    obs.subscribe(() => {});

    setInterval(async () => {
      const lastPrice = await service.getLastPrice(ex, symbol);
      console.log(lastPrice);
    }, 1000);

    await wait(30 * 1000);
    unsubs();
    await wait(30 * 1000);
  });
});
