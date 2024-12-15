import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { Env } from '@/env';
import { UserInfo } from '@/auth/user-info';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // jwtFromRequest: ExtractJwt.fromHeader(AUTHORIZATION_HEADER),
      // jwtFromRequest: ExtractJwt.fromUrlQueryParameter('_access_token'),
      ignoreExpiration: true,
      secretOrKey: Env.auth?.jwtSecret,
    } as StrategyOptions);
  }

  async validate(payload: UserInfo): Promise<UserInfo> {
    if (payload?.userId) {
      return payload;
    }
    return null;
  }
}
