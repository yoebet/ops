import { Module } from '@nestjs/common';
import { Provider } from '@nestjs/common/interfaces/modules/provider.interface';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { MarketDataService } from '@/data-service/market-data.service';
import { KafkaClientsService } from '@/data-service/kafka-clients.service';
import { DataChannelService } from '@/data-service/data-channel.service';

const services: Provider[] = [
  MarketDataService,
  KafkaClientsService,
  DataChannelService,
];

@Module({
  imports: [SystemConfigModule],
  providers: services,
  exports: services,
})
export class MarketDataModule {}
