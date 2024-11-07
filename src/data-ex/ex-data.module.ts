import { Module, Provider } from '@nestjs/common';
import { ExPublicWsService } from '@/data-ex/ex-public-ws.service';
import { CommonServicesModule } from '@/common-services/common-services.module';
import { ExchangeModule } from '@/exchange/exchange.module';
import { MarketDataModule } from '@/data-service/market-data.module';
import { ExPrivateWsService } from '@/data-ex/ex-private-ws.service';
import { ExPublicDataService } from '@/data-ex/ex-public-data.service';
import { ExKlineDataController } from '@/data-ex/controller/ex-kline-data.controller';

const services: Provider[] = [
  ExPublicWsService,
  ExPrivateWsService,
  ExPublicDataService,
];

@Module({
  imports: [CommonServicesModule, ExchangeModule, MarketDataModule],
  providers: services,
  exports: services,
  controllers: [ExKlineDataController],
})
export class ExDataModule {}
