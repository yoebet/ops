/**
 * 尽可能保证我们抛的所有错误都实现这个接口。
 *
 * 这里参考了 Google Api 设计:
 * https://www.bookstack.cn/read/API-design-guide/API-design-guide-07-%E9%94%99%E8%AF%AF.md
 *
 * 另外，可以注意各层次的 exception-filters 区别:
 * https://docs.nestjs.com/exception-filters
 * https://docs.nestjs.com/microservices/exception-filters
 * https://docs.nestjs.com/graphql/other-features#exception-filters
 */
export interface IError {
  // 固定字段，用于做类型判断。如果某个 object 的 __type === 'IError' 则认为它是 IError
  __type: 'IError';
  // 错误码，用于对错误进行分类
  code: ErrorCode;
  // 所在模块名
  module: string;
  // 错误描述，非必选
  message?: string;
  // 额外的错误信息，通常用于客户端处理错误
  details?: Record<string, any>;
}

/**
 * 这里使用了行业标准的 Http 状态码来做分类
 */
export enum ErrorCode {
  CONTINUE = 100,
  SWITCHING_PROTOCOLS = 101,
  PROCESSING = 102,
  EARLYHINTS = 103,
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NON_AUTHORITATIVE_INFORMATION = 203,
  NO_CONTENT = 204,
  RESET_CONTENT = 205,
  PARTIAL_CONTENT = 206,
  AMBIGUOUS = 300,
  MOVED_PERMANENTLY = 301,
  FOUND = 302,
  SEE_OTHER = 303,
  NOT_MODIFIED = 304,
  TEMPORARY_REDIRECT = 307,
  PERMANENT_REDIRECT = 308,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  PAYMENT_REQUIRED = 402,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  NOT_ACCEPTABLE = 406,
  PROXY_AUTHENTICATION_REQUIRED = 407,
  REQUEST_TIMEOUT = 408,
  CONFLICT = 409,
  GONE = 410,
  LENGTH_REQUIRED = 411,
  PRECONDITION_FAILED = 412,
  PAYLOAD_TOO_LARGE = 413,
  URI_TOO_LONG = 414,
  UNSUPPORTED_MEDIA_TYPE = 415,
  REQUESTED_RANGE_NOT_SATISFIABLE = 416,
  EXPECTATION_FAILED = 417,
  I_AM_A_TEAPOT = 418,
  MISDIRECTED = 421,
  UNPROCESSABLE_ENTITY = 422,
  FAILED_DEPENDENCY = 424,
  PRECONDITION_REQUIRED = 428,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
  HTTP_VERSION_NOT_SUPPORTED = 505,
}

export function toIError(error: unknown, module = 'unset') {
  let result: IError;
  if ('__type' in (error as any) && (error as any).__type === 'IError') {
    result = error as IError;
  } else if (error instanceof Error) {
    result = {
      __type: 'IError',
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      module,
      message: error.message,
      details: {
        type: error.constructor ? error.constructor.name : undefined,
      },
    };
  } else {
    result = {
      __type: 'IError',
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      module,
      message: `${error}`,
      details: {
        type: typeof error,
      },
    };
  }
  return result;
}
