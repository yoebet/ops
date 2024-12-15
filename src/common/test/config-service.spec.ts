import { Test } from '@nestjs/testing';
import { CommonServicesModule } from '@/common-services/common-services.module';
import { ConfigService } from '@nestjs/config';
// import { Config } from '@/common/config.types';

describe('ConfigService', () => {
  // let configService: ConfigService<Config>;
  let configService: ConfigService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CommonServicesModule],
    }).compile();

    await moduleRef.init();
    configService = moduleRef.get(ConfigService);
  });

  it('config', async () => {
    const exc = configService.get('exchange');
    console.log(exc);
    const excs1 = configService.get('exchange.socksProxies' as any);
    console.log(excs1);
    const excs2 = configService.get<string[]>('exchange.socksProxies', {
      infer: true,
    });
    console.log(excs2);
  });
});
