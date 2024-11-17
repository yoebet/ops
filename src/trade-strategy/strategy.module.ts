import { Module, Provider } from '@nestjs/common';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { StrategyService } from '@/trade-strategy/strategy.service';
import { MarketDataModule } from '@/data-service/market-data.module';
import { JobsModule } from '@/job/jobs.module';
import { ExWsModule } from '@/data-ex-ws/ex-ws.module';
import { ExchangeModule } from '@/exchange/exchange.module';

const services: Provider[] = [StrategyService];

@Module({
  imports: [
    SystemConfigModule,
    MarketDataModule,
    JobsModule,
    ExchangeModule,
    ExWsModule,
  ],
  providers: services,
  exports: services,
})
export class StrategyModule {}
