import { Module } from '@nestjs/common';
import { Provider } from '@nestjs/common/interfaces/modules/provider.interface';
import { CommonServicesModule } from '@/common-services/common-services.module';
import { KafkaClientsService } from '@/data-service/kafka-clients.service';
import { DataChannelService } from '@/data-service/data-channel.service';
import { KlineDataService } from '@/data-service/kline-data.service';
import { KlineDataController } from '@/data-service/controller/kline-data.controller';

const services: Provider[] = [
  KafkaClientsService,
  DataChannelService,
  KlineDataService,
];

@Module({
  imports: [CommonServicesModule],
  providers: services,
  exports: services,
  controllers: [KlineDataController],
})
export class MarketDataModule {}
