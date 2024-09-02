import { Test } from '@nestjs/testing';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { DbModule } from '@/db/db-module';
import { wait } from '@/common/utils/utils';
import { DataPublishModule } from '@/data-publish/data-publish.module';
import { DataPublishService } from '@/data-publish/data-publish.service';

jest.setTimeout(500_000);

describe('publish-data', () => {
  let service: DataPublishService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemConfigModule, DbModule, DataPublishModule],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(DataPublishService);
  });

  describe('query', () => {
    it('build-hierarchy-1', async () => {
      const treeText = service.collectTaskTree();
      console.log(treeText);

      await wait(2_000);
    });

    it('start', async () => {
      await service.start({});
      await wait(200_000);
    });
  });
});
