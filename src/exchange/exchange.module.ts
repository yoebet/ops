import { Module, Provider } from '@nestjs/common';
import { CommonServicesModule } from '@/common-services/common-services.module';
import { Exchanges } from '@/exchange/exchanges';

const services: Provider[] = [Exchanges];

@Module({
  imports: [CommonServicesModule],
  providers: services,
  exports: services,
})
export class ExchangeModule {}
