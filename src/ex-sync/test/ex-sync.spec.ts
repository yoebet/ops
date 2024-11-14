import { Test } from '@nestjs/testing';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { ExchangeModule } from '@/exchange/exchange.module';
import { ExAssetService } from '@/ex-sync/ex-asset.service';
import { ExOrderService } from '@/ex-sync/ex-order.service';

jest.setTimeout(60_000);

describe('ex-sync', () => {
  let assetService: ExAssetService;
  let orderService: ExOrderService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemConfigModule, ExchangeModule],
      providers: [ExAssetService, ExOrderService],
    }).compile();

    assetService = moduleRef.get(ExAssetService);
    orderService = moduleRef.get(ExOrderService);
  });

  it('bals', async () => {
    const bals = await assetService.syncAssets();
    console.log(bals);
  });

  it('pending orders', async () => {
    const ords = await orderService.syncPendingOrders();
    console.log(ords);
  });
});
