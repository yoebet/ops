import { Module } from '@nestjs/common';
import { DataWsGateway } from './data-ws.gateway';
import { DataQueryService } from './services/data-query.service';
import { MetadataService } from './services/metadata.service';
import { DataSubscriptionService } from './services/data-subscription.service';
import { DataServerController } from '@/data-server/data-server.controller';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { MarketDataModule } from '@/data-service/market-data.module';
import { AuthModule } from '@/common-web/auth/auth.module';

@Module({
  imports: [SystemConfigModule, MarketDataModule],
  providers: [
    AuthModule,
    DataWsGateway,
    MetadataService,
    DataQueryService,
    DataSubscriptionService,
  ],
  controllers: [DataServerController],
})
export class DataServerModule {}
