import {
  MiddlewareConsumer,
  Module,
  NestModule,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AppController } from './app.controller';
import { CommonModule } from './common/common.module';
import { DbModule } from './db/db-module';
import { LoggerMiddleware } from '@/common/middleware/logger.middleware';
import { CommonServicesModule } from '@/common-services/common-services.module';
import { ExchangeController } from '@/controller/exchange.controller';
import { MarketDataModule } from '@/data-service/market-data.module';
import { AppServers } from '@/app-servers';
import { AdminLoggerController } from '@/controller/admin-logger.controller';
import { ExDataModule } from '@/data-ex/ex-data.module';
import { AuthModule } from '@/auth/auth.module';
import { JobsModule } from '@/job/jobs.module';
import { StrategyModule } from '@/strategy/strategy.module';
import { ExSyncModule } from '@/ex-sync/ex-sync.module';
import { HistoryDataLoaderModule } from '@/data-loader/history-data-loader.module';
import { StrategyBacktestModule } from '@/strategy-backtest/strategy-backtest.module';
import { UserModule } from '@/user/user-module';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
      exclude: ['/ops/*'],
    }),
    CommonModule,
    DbModule,
    JobsModule,
    AuthModule,
    CommonServicesModule,
    MarketDataModule,
    HistoryDataLoaderModule,
    ExDataModule,
    StrategyModule,
    StrategyBacktestModule,
    ExSyncModule,
    UserModule,
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
