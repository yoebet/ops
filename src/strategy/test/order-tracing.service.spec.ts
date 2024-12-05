import { Test } from '@nestjs/testing';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { StrategyModule } from '@/strategy/strategy.module';
import { HOUR_MS } from '@/common/utils/utils';
import { MockOrderTracingService } from '@/strategy/mock-order-tracing.service';
import { ExOrder } from '@/db/models/ex-order';

jest.setTimeout(HOUR_MS);

describe('trace order', () => {
  let service: MockOrderTracingService;
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemConfigModule, StrategyModule],
    }).compile();
    await moduleRef.init();
    service = moduleRef.get(MockOrderTracingService);
  });

  // it('summit all pending orders', async () => {
  //   await service.summitAllJobs();
  // });
  //
  // it('summit', async () => {
  //   await service.summitJob(7, true);
  // });

  it('run 1', async () => {
    const order = await ExOrder.findOneBy({ id: 20 });
    await service.traceAndFillOrder(order);
  });
});
