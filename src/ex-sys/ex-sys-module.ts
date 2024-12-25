import { Module } from '@nestjs/common';
import { CommonServicesModule } from '@/common-services/common-services.module';
import { ConsoleModule } from 'nestjs-console';
import { AuthModule } from '@/auth/auth.module';
import { ExchangeSymbolsController } from '@/ex-sys/exchange-symbols.controller';
import { UnifiedSymbolsController } from '@/ex-sys/unified-symbols.controller';
import { ExchangeCoinsController } from '@/ex-sys/exchange-coins.controller';

@Module({
  imports: [ConsoleModule, CommonServicesModule, AuthModule],
  providers: [],
  controllers: [
    ExchangeCoinsController,
    ExchangeSymbolsController,
    UnifiedSymbolsController,
  ],
})
export class ExSysModule {}
