import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { Config } from '@/common/config.types';
import { Req } from '@/common-web/web.types';
import { NoAccessTokenError } from '@/common/app-errors';

@Injectable()
export class AdministratorGuard implements CanActivate {
  private readonly accessToken: string;

  constructor(private configService: ConfigService<Config>) {
    this.accessToken = 'abc'; // TODO
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    if (!this.accessToken) {
      return true;
    }
    const hc = context.switchToHttp();
    const req: Req = hc.getRequest();
    const token = req.headers.authorization;
    if (token === undefined) {
      throw new NoAccessTokenError();
    }
    return this.accessToken === token;
  }
}
