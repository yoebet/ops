import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { Env } from '@/env';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: Env.auth?.jwtSecret,
      signOptions: {
        /*expiresIn: Config.JwtExpiresIn*/
      },
    }),
  ],
  providers: [JwtStrategy],
  exports: [],
})
export class AuthModule {}
