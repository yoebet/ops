import { Test } from '@nestjs/testing';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { Strategy } from '@/db/models/strategy';
import { StrategyModule } from '@/trade-strategy/strategy.module';
import { StrategyService } from '@/trade-strategy/strategy.service';

jest.setTimeout(60_000);

describe('strategy runner', () => {
  let service: StrategyService;
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemConfigModule, StrategyModule],
    }).compile();
    await moduleRef.init();
    service = moduleRef.get(StrategyService);
  });

  it('summit all pending strategies', async () => {
    await service.summitAllJobs();
  });

  it('summit', async () => {
    await service.summitJob(3);
  });

  it('run 1', async () => {
    const strategy = await Strategy.findOneBy({ id: 7 });
    await service.runStrategy(strategy);
  });
});
