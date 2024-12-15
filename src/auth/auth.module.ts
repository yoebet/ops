import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { Env } from '@/env';
import { AuthService } from '@/auth/auth.service';
import { LocalStrategy } from '@/auth/strategies/local.strategy';
import { CommonServicesModule } from '@/common-services/common-services.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: Env.auth?.jwtSecret,
      signOptions: {
        /*expiresIn: Config.JwtExpiresIn*/
      },
    }),
    CommonServicesModule,
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
