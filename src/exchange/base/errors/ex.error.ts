import { ErrorCode, IError } from '@/common/errors/IError';
import { ExchangeCode } from '@/exchange/exchanges-types';

/**
 * exchange 模块内的基础错误
 */
export class ExError extends Error implements IError {
  __type = 'IError' as const;
  static MODULE = 'exchange';
  code: ErrorCode;
  module: string;
  details?: Record<string, any>;

  constructor(
    message?: string,
    details?: { exchangeId?: ExchangeCode } | Record<string, any>,
    code?: ErrorCode,
  ) {
    super(message);
    // 默认为内部错误
    this.code = code ?? ErrorCode.INTERNAL_SERVER_ERROR;
    this.module = ExError.MODULE;
    this.details = { type: this.constructor.name, ...details };
  }
}
