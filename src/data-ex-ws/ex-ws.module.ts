import { Module, Provider } from '@nestjs/common';
import { ExPublicWsService } from '@/data-ex-ws/ex-public-ws.service';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { ExchangeModule } from '@/exchange/exchange.module';
import { MarketDataModule } from '@/data-service/market-data.module';
import { ExPrivateWsService } from '@/data-ex-ws/ex-private-ws.service';

const services: Provider[] = [ExPublicWsService, ExPrivateWsService];

@Module({
  imports: [SystemConfigModule, ExchangeModule, MarketDataModule],
  providers: services,
  exports: services,
})
export class ExWsModule {}
