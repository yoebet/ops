import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  addTransactionalDataSource,
  getDataSourceByName,
} from 'typeorm-transactional';
import { DataSource } from 'typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { getConnectionOptions } from '@/db/data-source';
import { DB_SCHEMA, Env } from '@/env';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      name: DB_SCHEMA,
      useFactory() {
        return getConnectionOptions();
      },
      async dataSourceFactory(options) {
        return (
          getDataSourceByName(DB_SCHEMA) ||
          addTransactionalDataSource({
            dataSource: new DataSource(options),
            name: DB_SCHEMA,
          })
        );
      },
    }),
    RedisModule.forRoot({
      type: 'single',
      // url: 'redis://localhost:6379',
      options: Env.redis,
    }),
  ],
  exports: [TypeOrmModule],
})
export class DbModule {}
