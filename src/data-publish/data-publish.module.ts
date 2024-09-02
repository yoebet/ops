import { Module } from '@nestjs/common';
import { Provider } from '@nestjs/common/interfaces/modules/provider.interface';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { DataPublishService } from '@/data-publish/data-publish.service';
import { MarketDataModule } from '@/data-service/market-data.module';

const services: Provider[] = [DataPublishService];

@Module({
  imports: [SystemConfigModule, MarketDataModule],
  providers: services,
  exports: services,
})
export class DataPublishModule {}
