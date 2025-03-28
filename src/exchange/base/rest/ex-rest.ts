import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { entries, isNil } from 'lodash';
import { AppLogger } from '@/common/app-logger';
import {
  ExRestParams,
  ExRestReqBuildParams,
  ExRestReqConfig,
  ExRestRes,
} from '@/exchange/base/rest/rest.type';
import { SocksProxyAgent } from 'socks-proxy-agent';

export abstract class ExRest {
  private readonly defaultScheme: string;
  private readonly defaultHost: string;
  private readonly proxies?: string[];
  private readonly agents?: SocksProxyAgent[];
  protected readonly logger?: AppLogger;

  protected constructor(params?: Partial<ExRestParams>) {
    this.defaultScheme = params.scheme ?? 'https';
    this.defaultHost = params.host;
    this.proxies = params.proxies;
    this.agents = [];
    this.logger =
      params.logger || AppLogger.build(`rest:${this.constructor.name}`);
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
    if (!params) {
      return str;
    }
    let pairs: [string, any][];
    if (params instanceof Array) {
      pairs = params;
    } else {
      pairs = entries(params);
    }
    // 过滤掉空值
    pairs = pairs.filter((i) => !isNil(i[1]));
    if (pairs.length === 0) {
      return str;
    }
    if (uriEncode) {
      pairs = pairs.map((nv) => nv.map(encodeURIComponent) as [string, any]);
    }
    str += pairs.map(([n, v]) => `${n}=${v}`).join('&');

    if (includeQuestionMark) {
      str = '?' + str;
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
    };

    if (this.proxies && this.proxies.length > 0) {
      const selectProxy = Math.floor(Math.random() * this.proxies.length);
      let agent = this.agents[selectProxy];
      if (!agent) {
        agent = new SocksProxyAgent(this.proxies[selectProxy]);
        this.agents[selectProxy] = agent;
      }
      defaultConfig.proxy = false;
      defaultConfig.httpAgent = agent;
      defaultConfig.httpsAgent = agent;
    }

    // 子类构造的配置
    const config = await this.buildReq(p);

    const requestConfig: AxiosRequestConfig = {
      ...defaultConfig,
      // 子类的配置可以覆盖默认配置
      ...config,
    };
    this.logger?.debug(config.url);

    let res: AxiosResponse;
    try {
      res = await axios.request(requestConfig);
    } catch (e) {
      this.logger.log(config);
      if (p.apiKey) {
        this.logger?.log(p.apiKey.key.substring(0, 7) + '...');
      }
      if (e instanceof AxiosError) {
        const response = e.response;
        if (response?.data) {
          throw new Error(`${e.message}: ${JSON.stringify(response.data)}`);
        }
      }
      throw e;
    }

    await this.handleResErrs(res);

    return res;
  }

  async request<T = any>(p: ExRestReqBuildParams): Promise<T> {
    return (await this.requestRaw(p)).data;
  }

  protected async handleResErrs(res: ExRestRes): Promise<void> {}

  /**
   * 构造请求的配置（在这里面进行签名）
   */
  protected abstract buildReq(
    p: ExRestReqBuildParams,
  ): Promise<ExRestReqConfig>;
}
