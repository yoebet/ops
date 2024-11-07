import { Module, Provider } from '@nestjs/common';
import { CommonServicesModule } from '@/common-services/common-services.module';
import { MarketDataModule } from '@/data-service/market-data.module';
import { JobsModule } from '@/job/jobs.module';
import { ExchangeModule } from '@/exchange/exchange.module';
import { BacktestService } from '@/strategy-backtest/backtest.service';
import { StrategyBacktestController } from '@/strategy-backtest/controller/strategy-backtest.controller';

const services: Provider[] = [BacktestService];

@Module({
  imports: [CommonServicesModule, MarketDataModule, JobsModule, ExchangeModule],
  providers: services,
  exports: services,
  controllers: [StrategyBacktestController],
})
export class StrategyBacktestModule {}
