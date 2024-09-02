import { Test } from '@nestjs/testing';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { DbModule } from '@/db/db-module';
import { wait } from '@/common/utils/utils';
import { TickerProducerModule } from '@/data-ticker/ticker-producer.module';
import { TickerPatcherService } from '@/data-ticker/ticker-patcher.service';
import { ExTradeTask } from '@/db/models/ex-trade-task';

jest.setTimeout(5000_000);

describe('ticker-patcher', () => {
  let service: TickerPatcherService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemConfigModule, DbModule, TickerProducerModule],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(TickerPatcherService);
  });

  describe('task', () => {
    it('patch', async () => {
      const task = await ExTradeTask.findOneBy({ id: '4g5qf8ezzftijhei' });
      await service.patchTradeData(task);

      await wait(2000_000);
    });
  });
});
