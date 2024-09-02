import { LoggerOptions } from 'typeorm/logger/LoggerOptions';
import { Logger, QueryRunner } from 'typeorm';

const p = '[a-z0-9_]+';

// 去掉字段别名 "ApiKey"."id" AS "ApiKey_id" => id
const RegStripFieldAlias = new RegExp(
  `"${p}"\\."(${p})"(?:\\s+(?:AS\\s+)?"${p}")?`,
  'ig',
);
// 去掉表别名 FROM "t_api_key" "ApiKey" => FROM t_api_key
const RegStripTableAlias = new RegExp(`"(${p})"\\s+"${p}"`, 'ig');
// SELECT id, created_at, updated_at, deleted_at, user_id, ... => SELECT *
const RegSelectStar = new RegExp(`SELECT\\s+${p}(,\\s*${p}){4,}`, 'ig');
// INSERT INTO "t_api_key"("id", ...) => INSERT INTO t_api_key(id, ...)
// UPDATE "t_api_key" SET "key" = $1, ... => UPDATE t_api_key SET key = $1, ...
const RegStripDq = new RegExp(`"(${p})"`, 'ig');
// id IN ($1) => id = $1
const RegStripScIn = new RegExp(`(${p}) IN \\((\\$\\d)\\)`, 'ig');
// ((user_id = $1 AND exchange_id = $2)) => (user_id = $1 AND exchange_id = $2)
const RegStripDp = new RegExp(`\\(\\s*(\\([^()]+\\))\\s*\\)`, 'ig');
// ( status = $1 ) AND ( deleted_at IS NULL ) => status = $1 AND deleted_at IS NULL
const RegStripSp = new RegExp(
  `\\(\\s*(${p}\\s*(?:=\\s*(?:\\$\\d+|${p})|IS NULL))\\s*\\)`,
  'ig',
);

export const simplifySql = (sql: string): string => {
  sql = sql.replace(RegStripFieldAlias, '$1');
  sql = sql.replace(RegStripTableAlias, '$1');
  sql = sql.replace(RegSelectStar, 'SELECT *');
  sql = sql.replace(RegStripDq, '$1');
  if (sql.includes('WHERE')) {
    if (sql.includes('IN ')) {
      sql = sql.replace(RegStripScIn, '$1 = $2');
    }
    sql = sql.replace(RegStripDp, '$1');
    sql = sql.replace(RegStripSp, '$1');
  }
  return sql;
};

/**
 * 基于 AdvancedConsoleLogger，为便于查看，简化了下 sql。 可能会导致不合语法
 */
export class SimplifiedSqlLogger implements Logger {
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
      console.log('query:', sql);
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
      console.error(`query failed:`, sql);
      console.error(`error:`, error);
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
    console.warn(`query is slow:`, sql);
    console.warn(`execution time:`, time);
  }

  /**
   * Logs events from the schema build process.
   */
  logSchemaBuild(message: string, _queryRunner?: QueryRunner) {
    if (
      this.options === 'all' ||
      (Array.isArray(this.options) && this.options.indexOf('schema') !== -1)
    ) {
      console.log(message);
    }
  }

  /**
   * Logs events from the migration run process.
   */
  logMigration(message: string, _queryRunner?: QueryRunner) {
    console.log(message);
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
          console.log(message);
        break;
      case 'info':
        if (
          this.options === 'all' ||
          (Array.isArray(this.options) && this.options.indexOf('info') !== -1)
        )
          console.log('INFO:', message);
        break;
      case 'warn':
        if (
          this.options === 'all' ||
          (Array.isArray(this.options) && this.options.indexOf('warn') !== -1)
        )
          console.warn(message);
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
