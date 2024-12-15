import { Request, Response } from 'express';
import { UserInfo } from '@/auth/user-info';

export declare type Req = Request & { user?: UserInfo };

export declare type Res = Response;

export const AUTHORIZATION_HEADER = 'authorization';
