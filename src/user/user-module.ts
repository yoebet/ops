import { Module } from '@nestjs/common';
import { CommonServicesModule } from '@/common-services/common-services.module';
import { ConsoleModule } from 'nestjs-console';
import { UsersService } from '@/user/users.service';
import { UsersController } from '@/user/users.controller';
import { SessionController } from '@/user/session.controller';
import { UserProfileController } from '@/user/user-profile.controller';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [ConsoleModule, CommonServicesModule, AuthModule],
  providers: [UsersService],
  controllers: [UsersController, SessionController, UserProfileController],
})
export class UserModule {}
