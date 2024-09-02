import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppLogger, LoggerInfo } from '@/common/app-logger';
import { LogLevel } from '@nestjs/common/services/logger.service';

@Controller('admin/loggers')
export class AdminLoggerController {
  constructor(private logger: AppLogger) {
    logger.setContext('admin-logger');
  }

  @Get('all')
  all(): string[] {
    this.logger.debug(`list all`);
    return AppLogger.allContext().sort();
  }

  @Post('grep')
  grep(@Body() req: { context: string }): Omit<LoggerInfo, 'logger'>[] {
    this.logger.log(`show levels`);
    return AppLogger.grep(req.context).map((li) => ({
      context: li.context,
      levels: li.levels,
    }));
  }

  @Post('setLevel')
  setLevel(
    @Body() req: { context: string; op: string; level: string },
  ): string {
    this.logger.debug(`set level`);
    const { context, op, level } = req;

    const AllLevels = ['log', 'error', 'warn', 'debug', 'verbose'];
    if (!AllLevels.includes(level)) {
      return `wrong level: ${level}`;
    }
    const logLevel = level as LogLevel;

    const li = AppLogger.get(context);
    if (!li) {
      return `not found: ${context}`;
    }
    const { logger } = li;

    if (op === 'add') {
      const change = logger.addLevel(logLevel);
      if (!change) {
        return 'no change.';
      }
      const msg = `${context}: +${logLevel}`;
      this.logger.log(msg);
      return msg;
    }

    if (op === 'remove') {
      const change = logger.removeLevel(logLevel);
      if (!change) {
        return 'no change.';
      }
      const msg = `${context}: -${logLevel}`;
      this.logger.log(msg);
      return msg;
    }

    this.logger.warn(`unknown op: ${op}`);
    return `unknown op: ${op}`;
  }
}
