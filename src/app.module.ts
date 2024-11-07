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
import { MarketDataModule } from '@/data-service/market-data.module';
import { AppServers } from '@/app-servers';
import { AdminLoggerController } from '@/controller/admin-logger.controller';
import { ExWsModule } from '@/data-ex-ws/ex-ws.module';
import { AuthModule } from '@/common-web/auth/auth.module';
import { JobsModule } from '@/job/jobs.module';

@Module({
  imports: [
    CommonModule,
    DbModule,
    JobsModule,
    AuthModule,
    SystemConfigModule,
    MarketDataModule,
    ExWsModule,
  ],
  controllers: [AppController, ExchangeController, AdminLoggerController],
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
