import { Module, Provider } from '@nestjs/common';
import { ExWsService } from '@/data-ex-ws/ex-ws.service';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { ExchangeModule } from '@/exchange/exchange.module';
import { MarketDataModule } from '@/data-service/market-data.module';

const services: Provider[] = [ExWsService];

@Module({
  imports: [SystemConfigModule, ExchangeModule, MarketDataModule],
  providers: services,
  exports: services,
})
export class ExWsModule {}
