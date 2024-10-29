import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AUTHORIZATION_HEADER, Req } from '@/common-web/web.types';
import { Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { Env } from '@/env';
import { UserInfo } from '@/common-web/auth/user-info';

export function authSocket(socket: Socket): UserInfo | null {
  if (!Env.auth) {
    return null;
  }
  const { jwtSecret: secret, bs, extraSecrets } = Env.auth;
  if (!secret) {
    return null;
  }
  const request: Req = socket?.request as Req;
  if (!request?.headers) {
    return null;
  }
  const token = request.headers[AUTHORIZATION_HEADER];
  if (!token) {
    return null;
  }
  let user = request.user;
  if (user?.userId) {
    return user;
  }
  try {
    user = jwt.verify(token, secret) as UserInfo;
    if (user) {
      user.bs = bs;
    }
  } catch (_e) {
    if (!extraSecrets) {
      return null;
    }
    for (const [bs, sr] of Object.entries(extraSecrets)) {
      try {
        user = jwt.verify(token, sr) as UserInfo;
      } catch (_e) {
        //
      }
      if (user) {
        user.bs = bs;
        break;
      }
    }
  }
  request.user = user;
  return user;
}

export const CurrentWsUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const socket = ctx.switchToWs().getClient<Socket>();
    return authSocket(socket);
  },
);
