import { Module, Provider } from '@nestjs/common';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { StrategyService } from '@/trade-strategy/strategy.service';
import { MarketDataModule } from '@/data-service/market-data.module';
import { JobsModule } from '@/job/jobs.module';
import { ExDataModule } from '@/data-ex/ex-data.module';
import { ExchangeModule } from '@/exchange/exchange.module';
import { ExSyncModule } from '@/ex-sync/ex-sync.module';
import { MockOrderTracingService } from '@/trade-strategy/mock-order-tracing.service';
import { BacktestService } from '@/trade-strategy/backtest/backtest.service';

const services: Provider[] = [
  StrategyService,
  MockOrderTracingService,
  BacktestService,
];

@Module({
  imports: [
    SystemConfigModule,
    MarketDataModule,
    JobsModule,
    ExchangeModule,
    ExDataModule,
    ExSyncModule,
  ],
  providers: services,
  exports: services,
})
export class StrategyModule {}
