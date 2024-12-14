import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AUTHORIZATION_HEADER, Req } from '@/common-web/web.types';
import { Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { Env } from '@/env';
import { JwtPayload, UserInfo } from '@/common-web/auth/user-info';

export function authSocket(socket: Socket): UserInfo | null {
  if (!Env.auth) {
    return null;
  }
  const { jwtSecret: secret } = Env.auth;
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
  user = jwt.verify(token, secret) as JwtPayload;
  request.user = user;
  return user;
}

export const CurrentWsUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const socket = ctx.switchToWs().getClient<Socket>();
    return authSocket(socket);
  },
);
