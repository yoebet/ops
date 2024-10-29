import axios, { AxiosRequestConfig } from 'axios';
import { entries, isNil } from 'lodash';
import { AppLogger } from '@/common/app-logger';
import {
  ExRestParams,
  ExRestReqBuildParams,
  ExRestReqConfig,
  ExRestRes,
} from '@/exchange/base/rest/rest.type';
import { ExAccountCode } from '@/exchange/exchanges-types';
import { SocksProxyAgent } from 'socks-proxy-agent';

export abstract class ExRest {
  private readonly defaultScheme: string;
  private readonly defaultHost: string;
  private readonly proxies?: string[];
  protected readonly logger?: AppLogger;

  protected exAccount: ExAccountCode;

  protected constructor(params?: Partial<ExRestParams>) {
    this.defaultScheme = params.scheme ?? 'https';
    this.defaultHost = params.host;
    this.proxies = params.proxies;
    this.exAccount = params.exAccount;
    this.logger = params.logger || AppLogger.build(`rest:${this.exAccount}`);
  }

  protected scheme(p: ExRestReqBuildParams): string {
    return p.scheme ?? this.defaultScheme;
  }

  protected host(p: ExRestReqBuildParams): string {
    return p.host ?? this.defaultHost;
  }

  protected hostUrl(p: ExRestReqBuildParams): string {
    return this.scheme(p) + '://' + this.host(p);
  }

  /**
   * 获取 url 参数字符串，例如: ?a=123&b=test
   * @param params 参数键值对
   * @param includeQuestionMark 是否包含 ? 号
   * @param uriEncode 是否对键值进行 uri 编码
   * @returns 参数字符串
   */
  protected urlParamsStr(
    params?: Record<string, any> | [string, any][],
    includeQuestionMark = false,
    uriEncode = true,
  ): string {
    let str = '';
    if (params) {
      let pairs: [string, any][];
      if (params instanceof Array) {
        pairs = params;
      } else {
        pairs = entries(params);
      }
      // 过滤掉空值
      pairs = pairs.filter((i) => !isNil(i[1]));
      if (pairs.length > 0) {
        str += pairs
          .map(
            (i) =>
              `${uriEncode ? encodeURIComponent(i[0]) : i[0]}=${
                uriEncode ? encodeURIComponent(i[1]) : i[1]
              }`,
          )
          .join('&');

        if (includeQuestionMark) {
          str = '?' + str;
        }
      }
    }
    return str;
  }

  protected url(
    p: ExRestReqBuildParams,
    params?: Record<string, any> | [string, any][],
  ): string {
    return this.hostUrl(p) + p.path + this.urlParamsStr(params, true);
  }

  protected jsonBody(params?: Record<string, any>): string {
    return params ? JSON.stringify(params) : '';
  }

  protected searchParamsBody(params?: Record<string, any>): URLSearchParams {
    return new URLSearchParams(params ?? []);
  }

  protected async requestRaw(p: ExRestReqBuildParams): Promise<ExRestRes> {
    // 默认配置
    const defaultConfig: AxiosRequestConfig = {
      // timeout: 5000,
      // 默认不根据 http status 来抛错误
      // validateStatus: () => true,
    };

    if (this.proxies && this.proxies.length > 0) {
      const selectProxy = Math.floor(Math.random() * this.proxies.length); //指定了代理 则在可用代理中随机选一个
      const agent = new SocksProxyAgent(this.proxies[selectProxy]);
      defaultConfig.proxy = false;
      defaultConfig.httpAgent = agent;
      defaultConfig.httpsAgent = agent;
    }

    // 子类构造的配置
    const config = await this.buildReq(p);

    const axiosRequestConfig: AxiosRequestConfig = {
      ...defaultConfig,
      // 子类的配置可以覆盖默认配置
      ...config,
    };
    this.logger?.debug(config.url);
    const res = await axios.request(axiosRequestConfig);

    return res;
  }

  protected async request<T>(p: ExRestReqBuildParams): Promise<T> {
    return (await this.requestRaw(p)).data;
  }

  /**
   * 构造请求的配置（在这里面进行签名）
   */
  protected abstract buildReq(
    p: ExRestReqBuildParams,
  ): Promise<ExRestReqConfig>;
}
