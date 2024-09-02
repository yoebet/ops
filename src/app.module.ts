import {
  MiddlewareConsumer,
  Module,
  NestModule,
  OnApplicationShutdown,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { CommonModule } from './common/common.module';
import { DbModule } from './db/db-module';
import { LoggerMiddleware } from '@/common-web/middleware/logger.middleware';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { ExchangeController } from '@/controller/exchange.controller';
import { GqlModule } from '@/gql/gql.module';
import { MarketDataModule } from '@/data-service/market-data.module';
import { OflowServerModule } from '@/oflow-server/oflow-server.module';
import { AppServers } from '@/app-servers';
import { AdminKafkaController } from '@/controller/admin-kafka.controller';
import { AdminLoggerController } from '@/controller/admin-logger.controller';
import { TickerProducerModule } from '@/data-ticker/ticker-producer.module';
import { AuthModule } from '@/common-web/auth/auth.module';
import { DataPublishModule } from '@/data-publish/data-publish.module';

@Module({
  imports: [
    CommonModule,
    DbModule,
    AuthModule,
    SystemConfigModule,
    MarketDataModule,
    TickerProducerModule,
    DataPublishModule,
    OflowServerModule,
    GqlModule,
  ],
  controllers: [
    AppController,
    ExchangeController,
    AdminKafkaController,
    AdminLoggerController,
  ],
  providers: [AppServers],
})
export class AppModule implements NestModule, OnApplicationShutdown {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }

  onApplicationShutdown(signal?: string): any {
    console.warn(
      `[shutdown] ${new Date().toLocaleString()} got signal: ${signal}`,
    );
  }
}
