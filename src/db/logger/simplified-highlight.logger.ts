import { LoggerOptions } from 'typeorm/logger/LoggerOptions';
import { Logger, QueryRunner } from 'typeorm';
import { PlatformTools } from 'typeorm/platform/PlatformTools';
import { simplifySql } from '@/db/logger/simplified-sql.logger';

/**
 * 基于 AdvancedConsoleLogger，为便于查看，简化了下 sql。 可能会导致不合语法
 */
export class SimplifiedHighlightLogger implements Logger {
  constructor(private options?: LoggerOptions) {}

  /**
   * Logs query and parameters used in it.
   */
  logQuery(query: string, parameters?: any[], _queryRunner?: QueryRunner) {
    if (
      this.options === 'all' ||
      this.options === true ||
      (Array.isArray(this.options) && this.options.indexOf('query') !== -1)
    ) {
      const sql =
        simplifySql(query) +
        (parameters && parameters.length
          ? ' -- PARAMETERS: ' + this.stringifyParams(parameters)
          : '');
      PlatformTools.logInfo('query:', PlatformTools.highlightSql(sql));
    }
  }

  /**
   * Logs query that is failed.
   */
  logQueryError(
    error: string,
    query: string,
    parameters?: any[],
    _queryRunner?: QueryRunner,
  ) {
    if (
      this.options === 'all' ||
      this.options === true ||
      (Array.isArray(this.options) && this.options.indexOf('error') !== -1)
    ) {
      const sql =
        simplifySql(query) +
        (parameters && parameters.length
          ? ' -- PARAMETERS: ' + this.stringifyParams(parameters)
          : '');
      PlatformTools.logError(`query failed:`, PlatformTools.highlightSql(sql));
      PlatformTools.logError(`error:`, error);
    }
  }

  /**
   * Logs query that is slow.
   */
  logQuerySlow(
    time: number,
    query: string,
    parameters?: any[],
    _queryRunner?: QueryRunner,
  ) {
    const sql =
      simplifySql(query) +
      (parameters && parameters.length
        ? ' -- PARAMETERS: ' + this.stringifyParams(parameters)
        : '');
    PlatformTools.logWarn(`query is slow:`, PlatformTools.highlightSql(sql));
    PlatformTools.logWarn(`execution time:`, time);
  }

  /**
   * Logs events from the schema build process.
   */
  logSchemaBuild(message: string, _queryRunner?: QueryRunner) {
    if (
      this.options === 'all' ||
      (Array.isArray(this.options) && this.options.indexOf('schema') !== -1)
    ) {
      PlatformTools.log(message);
    }
  }

  /**
   * Logs events from the migration run process.
   */
  logMigration(message: string, _queryRunner?: QueryRunner) {
    PlatformTools.log(message);
  }

  /**
   * Perform logging using given logger, or by default to the console.
   * Log has its own level and message.
   */
  log(
    level: 'log' | 'info' | 'warn',
    message: any,
    _queryRunner?: QueryRunner,
  ) {
    switch (level) {
      case 'log':
        if (
          this.options === 'all' ||
          (Array.isArray(this.options) && this.options.indexOf('log') !== -1)
        )
          PlatformTools.log(message);
        break;
      case 'info':
        if (
          this.options === 'all' ||
          (Array.isArray(this.options) && this.options.indexOf('info') !== -1)
        )
          PlatformTools.logInfo('INFO:', message);
        break;
      case 'warn':
        if (
          this.options === 'all' ||
          (Array.isArray(this.options) && this.options.indexOf('warn') !== -1)
        )
          console.warn(PlatformTools.warn(message));
        break;
    }
  }

  /**
   * Converts parameters to a string.
   * Sometimes parameters can have circular objects and therefore we are handle this case too.
   */
  protected stringifyParams(parameters: any[]) {
    try {
      return JSON.stringify(parameters);
    } catch (error) {
      // most probably circular objects in parameters
      return parameters;
    }
  }
}
