import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { join } from 'path';
import {
  AdvancedConsoleLogger,
  DataSource,
  SimpleConsoleLogger,
} from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { ConnectionOptions } from '@/common/config.types';
import config, { DbConfig } from '@/env';
import { Logger as TypeormLogger } from 'typeorm/logger/Logger';
import { SimplifiedHighlightLogger } from '@/db/logger/simplified-highlight.logger';
import { SimplifiedSqlLogger } from '@/db/logger/simplified-sql.logger';

export const getConnectionOptions = (): ConnectionOptions => {
  const { log: logConfig } = config();
  let logger: TypeormLogger;
  const loggerOptions = logConfig?.dbLogger;
  const { options, highlightSql, simplifySql } = loggerOptions;
  if (simplifySql) {
    if (highlightSql) {
      logger = new SimplifiedHighlightLogger(options);
    } else {
      logger = new SimplifiedSqlLogger(options);
    }
  } else {
    if (highlightSql) {
      logger = new AdvancedConsoleLogger(options);
    } else {
      logger = new SimpleConsoleLogger(options);
    }
  }
  return {
    ...DbConfig,
    synchronize: false,
    entityPrefix: 't_',
    entities: [join(__dirname, 'models', '**', '*{.ts,.js}')],
    migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
    namingStrategy: new SnakeNamingStrategy(),
    logger,
  };
};

initializeTransactionalContext();

// for migration
export default new DataSource(getConnectionOptions());
