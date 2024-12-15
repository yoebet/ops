import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AppLogger } from '@/common/app-logger';
import { Res } from '@/common/web.types';
import { AppError } from '@/common/app-errors';
import { ApiResult } from '@/common/api-result';

@Catch()
export class CatchAllFilter implements ExceptionFilter {
  constructor(private logger: AppLogger) {
    logger.setContext('CatchAllFilter');
  }

  catch(ex: unknown, host: ArgumentsHost) {
    this.logger.error(ex);

    const ctx = host.switchToHttp();
    const response: Res = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (ex instanceof Error && ex.message) {
      message = ex.message;
    }
    if (ex instanceof HttpException) {
      status = ex.getStatus();
    } else if (ex instanceof AppError) {
      if (ex.httpStatus) {
        status = ex.httpStatus;
      }
    }

    const result = new ApiResult(status, message);

    response.status(status).json(result);
  }
}
