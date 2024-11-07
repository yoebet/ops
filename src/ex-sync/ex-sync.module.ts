import { Module, Provider } from '@nestjs/common';
import { CommonServicesModule } from '@/common-services/common-services.module';
import { ExAssetService } from '@/ex-sync/ex-asset.service';
import { ExOrderService } from '@/ex-sync/ex-order.service';
import { MarketDataModule } from '@/data-service/market-data.module';
import { JobsModule } from '@/job/jobs.module';
import { ExDataModule } from '@/data-ex/ex-data.module';
import { ExchangeModule } from '@/exchange/exchange.module';

const services: Provider[] = [ExAssetService, ExOrderService];

@Module({
  imports: [
    CommonServicesModule,
    MarketDataModule,
    JobsModule,
    ExchangeModule,
    ExDataModule,
  ],
  providers: services,
  exports: services,
})
export class ExSyncModule {}
