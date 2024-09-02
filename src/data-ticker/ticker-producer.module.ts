import { Module, Provider } from '@nestjs/common';
import { TickerProducerService } from '@/data-ticker/ticker-producer.service';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { ExchangeModule } from '@/exchange/exchange.module';
import { MarketDataModule } from '@/data-service/market-data.module';
import { TickerRollupService } from '@/data-ticker/ticker-rollup.service';
import { TickerPatcherService } from '@/data-ticker/ticker-patcher.service';

const services: Provider[] = [
  TickerProducerService,
  TickerRollupService,
  TickerPatcherService,
];

@Module({
  imports: [SystemConfigModule, ExchangeModule, MarketDataModule],
  providers: services,
  exports: services,
})
export class TickerProducerModule {}
