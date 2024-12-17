import { Module, Provider } from '@nestjs/common';
import { CommonServicesModule } from '@/common-services/common-services.module';
import { StrategyService } from '@/strategy/strategy.service';
import { MarketDataModule } from '@/data-service/market-data.module';
import { JobsModule } from '@/job/jobs.module';
import { ExDataModule } from '@/data-ex/ex-data.module';
import { ExchangeModule } from '@/exchange/exchange.module';
import { ExSyncModule } from '@/ex-sync/ex-sync.module';
import { MockOrderTracingService } from '@/strategy/mock-order-tracing.service';
import { StrategyController } from '@/strategy/controller/strategy.controller';
import { StrategyTemplateController } from '@/strategy/controller/strategy-template.controller';

const services: Provider[] = [StrategyService, MockOrderTracingService];

@Module({
  imports: [
    CommonServicesModule,
    MarketDataModule,
    JobsModule,
    ExchangeModule,
    ExDataModule,
    ExSyncModule,
  ],
  providers: services,
  exports: services,
  controllers: [StrategyController, StrategyTemplateController],
})
export class StrategyModule {}
