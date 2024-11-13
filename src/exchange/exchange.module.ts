import { Module, Provider } from '@nestjs/common';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { Exchanges } from '@/exchange/exchanges';

const services: Provider[] = [Exchanges];

@Module({
  imports: [SystemConfigModule],
  providers: services,
  exports: services,
})
export class ExchangeModule {}
