import { AppLogger } from '@/common/app-logger';
import { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface ExRestParams {
  scheme?: string;
  host: string;
  proxies?: string[];
  logger?: AppLogger;
}

export enum HttpMethodType {
  get = 'GET',
  post = 'POST',
  put = 'PUT',
  delete = 'DELETE',
}

export interface ExApiKey {
  key: string;
  secret: string;
  password?: string;
  secret2fa?: string;
  subaccount?: string;
  withdrawPassword?: string;
}

export type ExRestReqBuildParams = {
  method: HttpMethodType;
  path: string;

  params?: Record<string, any>;
  // 有些交易所分 url params 和 body params
  params2?: Record<string, any>;
  // 传了 apiKey 就得进行签名
  apiKey?: ExApiKey;
  headers?: Record<string, string>;

  // 下面的参数，不传的话用 BaseExRest 的默认值
  scheme?: string;
  host?: string;
};

export type ExRestReqConfig = Omit<AxiosRequestConfig, 'method' | 'url'> & {
  method: HttpMethodType;
  url: string;
};
export type ExRestRes = AxiosResponse;
