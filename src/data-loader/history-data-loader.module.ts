import { Module, Provider } from '@nestjs/common';
import { CommonServicesModule } from '@/common-services/common-services.module';
import { ExchangeModule } from '@/exchange/exchange.module';
import { MarketDataModule } from '@/data-service/market-data.module';
import { HistoryDataLoaderService } from '@/data-loader/history-data-loader.service';
import { JobsModule } from '@/job/jobs.module';
import { DataLoaderController } from '@/data-loader/data-loader.controller';

const services: Provider[] = [HistoryDataLoaderService];

@Module({
  imports: [CommonServicesModule, ExchangeModule, MarketDataModule, JobsModule],
  providers: services,
  exports: services,
  controllers: [DataLoaderController],
})
export class HistoryDataLoaderModule {}
