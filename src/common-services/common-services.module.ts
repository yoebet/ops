import { Module } from '@nestjs/common';
import { Provider } from '@nestjs/common/interfaces/modules/provider.interface';
import { CommonModule } from '@/common/common.module';
import { DbModule } from '@/db/db-module';
import { SysConfigService } from '@/common-services/sys-config.service';
import { ExSymbolService } from '@/common-services/ex-symbol.service';
import { UserAccountService } from '@/common-services/user-account.service';

const services: Provider[] = [
  SysConfigService,
  ExSymbolService,
  UserAccountService,
];

@Module({
  imports: [CommonModule, DbModule],
  providers: services,
  exports: services,
})
export class CommonServicesModule {}
