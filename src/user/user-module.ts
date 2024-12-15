import { Module } from '@nestjs/common';
import { UserAccountService } from '@/user/user-account.service';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { ConsoleModule } from 'nestjs-console';
import { UsersService } from '@/user/users.service';
import { UsersController } from '@/user/users.controller';
import { SessionController } from '@/user/session.controller';
import { UserProfileController } from '@/user/user-profile.controller';

@Module({
  imports: [ConsoleModule, SystemConfigModule],
  providers: [UserAccountService, UsersService],
  controllers: [UsersController, SessionController, UserProfileController],
})
export class UserModule {}
