import { Test } from '@nestjs/testing';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { Strategy } from '@/db/models/strategy';
import { StrategyModule } from '@/strategy/strategy.module';
import { StrategyService } from '@/strategy/strategy.service';
import { HOUR_MS } from '@/common/utils/utils';

jest.setTimeout(HOUR_MS);

describe('strategy runner', () => {
  let service: StrategyService;
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemConfigModule, StrategyModule],
    }).compile();
    await moduleRef.init();
    service = moduleRef.get(StrategyService);
    service.start();
  });

  it('summit all pending strategies', async () => {
    await service.summitAllJobs();
  });

  it('summit', async () => {
    await service.summitJob(7, true);
  });

  it('run 1', async () => {
    const strategy = await Strategy.findOneBy({ id: 7 });
    await service.runStrategy(strategy);
  });
});
