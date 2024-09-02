import { Module } from '@nestjs/common';
import { OflowWsGateway } from './oflow-ws.gateway';
import { OFlowMarketDataService } from './services/oflow-market-data.service';
import { OflowMetadataService } from './services/oflow-metadata.service';
import { OflowSubscriptionService } from './services/oflow-subscription.service';
import { OflowDataController } from '@/oflow-server/oflow-data.controller';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { MarketDataModule } from '@/data-service/market-data.module';
import { OflowUserDataService } from '@/oflow-server/services/oflow-user-data.service';
import { AuthModule } from '@/common-web/auth/auth.module';

@Module({
  imports: [SystemConfigModule, MarketDataModule],
  providers: [
    AuthModule,
    OflowWsGateway,
    OflowMetadataService,
    OflowUserDataService,
    OFlowMarketDataService,
    OflowSubscriptionService,
  ],
  controllers: [OflowDataController],
})
export class OflowServerModule {}
