import { Module } from '@nestjs/common';
import { UserAccountService } from '@/user/user-account.service';
import { SystemConfigModule } from '@/common-services/system-config.module';

@Module({
  imports: [SystemConfigModule],
  providers: [UserAccountService],
})
export class UserModule {}
