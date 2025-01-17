import { Test } from '@nestjs/testing';
import { CommonServicesModule } from '@/common-services/common-services.module';
import { Strategy } from '@/db/models/strategy/strategy';
import { StrategyModule } from '@/strategy/strategy.module';
import { StrategyService } from '@/strategy/strategy.service';
import { HOUR_MS } from '@/common/utils/utils';
import { StrategyDeal } from '@/db/models/strategy/strategy-deal';
import { ExOrder } from '@/db/models/ex-order';

jest.setTimeout(HOUR_MS);

describe('strategy runner', () => {
  let service: StrategyService;
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CommonServicesModule, StrategyModule],
    }).compile();
    await moduleRef.init();
    service = moduleRef.get(StrategyService);
    service.definePaperTradeJobs();
    service.defineRealTradeJobs();
  });

  it('summit all pending strategies', async () => {
    await service.summitAllJobs();
  });

  it('summit', async () => {
    await service.summitJob(7, true);
  });

  it('run 1', async () => {
    const strategy = await Strategy.findOneBy({ id: 14 });
    await service.runStrategy(strategy);
  });

  it('rerun 1', async () => {
    const sid = 73;
    await StrategyDeal.delete({ strategyId: sid });
    await ExOrder.delete({ strategyId: sid });
    const strategy = await Strategy.findOneBy({ id: sid });
    await service.runStrategy(strategy);
  });

  it('run all', async () => {
    const strategies = await Strategy.findBy({ active: true });
    await Promise.all(strategies.map((s) => service.runStrategy(s)));
  });

  it('clear jobs', async () => {
    await service.clearCompletedJobs();
    await service.clearFailedJobs();
  });
});
