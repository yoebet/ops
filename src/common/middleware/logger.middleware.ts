import { Injectable, NestMiddleware } from '@nestjs/common';
import { isEmpty } from 'lodash';
import { AppLogger } from '@/common/app-logger';
import { Req, Res } from '@/common/web.types';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private logger: AppLogger) {
    logger.setContext('LoggerMiddleware');
  }

  use(req: Req, res: Res, next: () => void) {
    if (req.method === 'OPTIONS') {
      return next();
    }
    this.logger.verbose('========= ' + req.ip);
    const methodAndUrl = `${req.method} ${decodeURIComponent(req.originalUrl)}`;
    if (req.method === 'GET') {
      this.logger.verbose(methodAndUrl);
    } else {
      this.logger.log(methodAndUrl);
    }
    this.logger.verbose(req.headers);
    // if (!isEmpty(req.query)) {
    //   this.logger.debug(req.query);
    // }
    if (req.method !== 'GET' && !isEmpty(req.body)) {
      if (req.body.operationName === 'IntrospectionQuery') {
      } else if (req.body.operationName === null) {
      } else {
        this.logger.debug(req.body);
      }
    }

    next();
  }
}
