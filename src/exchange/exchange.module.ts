import { Module, Provider } from '@nestjs/common';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { ExchangeWsService } from '@/exchange/exchange-ws.service';
import { ExMonitorService } from '@/exchange/admin/ex-monitor.service';
import { ExchangeRestService } from '@/exchange/exchange-rest.service';

const services: Provider[] = [
  ExchangeWsService,
  ExMonitorService,
  ExchangeRestService,
];

@Module({
  imports: [SystemConfigModule],
  providers: services,
  exports: services,
})
export class ExchangeModule {}
