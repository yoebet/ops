import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { Env } from '@/env';
import { AuthService } from '@/common-web/auth/auth.service';
import { LocalStrategy } from '@/common-web/auth/strategies/local.strategy';
import { UserModule } from '@/user/user-module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: Env.auth?.jwtSecret,
      signOptions: {
        /*expiresIn: Config.JwtExpiresIn*/
      },
    }),
    UserModule,
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [],
})
export class AuthModule {}
