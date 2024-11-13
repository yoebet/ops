import { Module, Provider } from '@nestjs/common';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { ExchangeWsService } from '@/exchange/exchange-ws.service';
import { ExchangeServiceLocator } from '@/exchange/exchange-service-locator';

const services: Provider[] = [ExchangeWsService, ExchangeServiceLocator];

@Module({
  imports: [SystemConfigModule],
  providers: services,
  exports: services,
})
export class ExchangeModule {}
