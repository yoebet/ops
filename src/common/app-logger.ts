import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Config, LogConfig } from '@/common/config.types';
import { LogLevel } from '@nestjs/common/services/logger.service';
import { Env } from '@/env';

export interface LoggerInfo {
  logger: AppLogger;
  context: string;
  levels: string[];
}

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger extends ConsoleLogger {
  static all: AppLogger[] = [];

  constructor(
    context: string,
    private configService: ConfigService<Config>,
  ) {
    super(context, {
      logLevels: configService.get('log', { infer: true }).levels,
    });
    AppLogger.all.push(this);
  }

  addLevel(level: LogLevel): boolean {
    const levels = this.options.logLevels;
    if (levels.includes(level)) {
      return false;
    }
    this.setLogLevels(levels.concat([level]));
    return true;
  }

  removeLevel(level: LogLevel): boolean {
    const levels = this.options.logLevels;
    if (!levels.includes(level)) {
      return false;
    }
    this.setLogLevels(levels.filter((l) => l !== level));
    return true;
  }

  static allContext(): string[] {
    return AppLogger.all.map((l) => l.context).filter((l) => l);
  }

  static grep(pat: string): LoggerInfo[] {
    return AppLogger.all
      .filter((l) => l.context?.includes(pat))
      .map((l) => ({
        logger: l,
        context: l.context,
        levels: l.options.logLevels,
      }));
  }

  static get(context: string): LoggerInfo | undefined {
    const logger = AppLogger.all.find((l) => context === l.context);
    if (!logger) {
      return undefined;
    }
    return {
      logger,
      context: logger.context,
      levels: logger.options.logLevels,
    };
  }

  newLogger(context: string, levels?: LogLevel[]): AppLogger {
    return AppLogger.build(context, levels || this.options.logLevels);
  }

  subLogger(subContext: string, levels?: LogLevel[]): AppLogger {
    const context = `${this.context}:${subContext}`;
    return AppLogger.build(context, levels || this.options.logLevels);
  }

  static from(
    template: AppLogger | undefined | null,
    context: string,
    levels?: LogLevel[],
  ): AppLogger {
    if (template) {
      return template.newLogger(context, levels);
    }
    return AppLogger.build(context, levels);
  }

  static build(context: string, levels?: LogLevel[]): AppLogger {
    if (!levels) {
      levels = Env.log.levels;
    }
    const cs = new ConfigService<Config>({
      log: { levels } as LogConfig,
    });
    return new AppLogger(context, cs);
  }
}
