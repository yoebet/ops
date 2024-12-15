import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Req } from '@/common/web.types';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request: Req = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
