import { HttpStatus } from '@nestjs/common/enums/http-status.enum';

export enum ErrorCodes {
  Internal = 'Internal',
}

export interface ErrorDetail {
  readonly message: string;
  readonly errCode?: string;
  readonly httpStatus?: HttpStatus;
}

export class AppError extends Error implements ErrorDetail {
  readonly errCode?: string;
  readonly httpStatus?: HttpStatus;

  constructor({ message, errCode, httpStatus }: ErrorDetail) {
    super(message);
    this.errCode = errCode;
    this.httpStatus = httpStatus;
    if (!errCode && httpStatus && httpStatus >= 300) {
      this.errCode = `http-${httpStatus}`;
    }
  }
}

export class NoAccessTokenError extends AppError {
  constructor() {
    super({
      message: 'no access-token',
      httpStatus: HttpStatus.UNAUTHORIZED,
    });
  }
}

export class InternalError extends AppError {
  constructor(message?: string) {
    super({
      message: message || 'Internal Error',
      errCode: ErrorCodes.Internal,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(message?: string) {
    super({
      message: message || 'not found',
      httpStatus: HttpStatus.NOT_FOUND,
    });
  }
}

export class NoSuchUserError extends NotFoundError {
  constructor(message?: string) {
    super(message || 'no such user (address owner)');
  }
}

export class ExistedError extends AppError {
  constructor(message?: string) {
    super({
      message: message || 'existed',
      httpStatus: HttpStatus.BAD_REQUEST,
    });
  }
}

export class BadRequestError extends AppError {
  constructor(message?: string) {
    super({
      message: message || 'bad request',
      httpStatus: HttpStatus.BAD_REQUEST,
    });
  }
}
