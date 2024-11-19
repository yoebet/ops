import { Module, Provider } from '@nestjs/common';
import { ExPublicWsService } from '@/data-ex/ex-public-ws.service';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { ExchangeModule } from '@/exchange/exchange.module';
import { MarketDataModule } from '@/data-service/market-data.module';
import { ExPrivateWsService } from '@/data-ex/ex-private-ws.service';
import { ExPublicDataService } from '@/data-ex/ex-public-data.service';

const services: Provider[] = [
  ExPublicWsService,
  ExPrivateWsService,
  ExPublicDataService,
];

@Module({
  imports: [SystemConfigModule, ExchangeModule, MarketDataModule],
  providers: services,
  exports: services,
})
export class ExDataModule {}
