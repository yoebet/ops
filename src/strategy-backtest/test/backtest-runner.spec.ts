import { Test } from '@nestjs/testing';
import { CommonServicesModule } from '@/common-services/common-services.module';
import { HOUR_MS } from '@/common/utils/utils';
import { StrategyBacktestModule } from '@/strategy-backtest/strategy-backtest.module';
import { BacktestService } from '@/strategy-backtest/backtest.service';
import { BacktestStrategy } from '@/db/models/backtest-strategy';
import { BacktestDeal } from '@/db/models/backtest-deal';
import { BacktestOrder } from '@/db/models/backtest-order';

jest.setTimeout(HOUR_MS);

describe('strategy backtest runner', () => {
  let service: BacktestService;
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CommonServicesModule, StrategyBacktestModule],
    }).compile();
    await moduleRef.init();
    service = moduleRef.get(BacktestService);

    service.start();
  });

  it('summit all pending strategies', async () => {
    await service.summitAllJobs();
  });

  it('summit', async () => {
    await service.summitJob(7, true);
  });

  it('run 1', async () => {
    const strategy = await BacktestStrategy.findOneBy({ id: 57 });
    await service.runStrategy(strategy);
  });

  it('rerun 1', async () => {
    const sid = 76;
    await BacktestDeal.delete({ strategyId: sid });
    await BacktestOrder.delete({ strategyId: sid });
    const strategy = await BacktestStrategy.findOneBy({ id: sid });
    if (!strategy.active) {
      strategy.active = true;
      await strategy.save();
    }
    await service.runStrategy(strategy);
  });
});
