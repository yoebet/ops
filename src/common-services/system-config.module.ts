import { Module } from '@nestjs/common';
import { Provider } from '@nestjs/common/interfaces/modules/provider.interface';
import { CommonModule } from '@/common/common.module';
import { DbModule } from '@/db/db-module';
import { SysConfigService } from '@/common-services/sys-config.service';
import { SymbolService } from '@/common-services/symbol.service';

const services: Provider[] = [SysConfigService, SymbolService];

@Module({
  imports: [CommonModule, DbModule],
  providers: services,
  exports: services,
})
export class SystemConfigModule {}
