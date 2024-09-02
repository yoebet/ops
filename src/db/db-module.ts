import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  addTransactionalDataSource,
  getDataSourceByName,
} from 'typeorm-transactional';
import { DataSource } from 'typeorm';
import { getConnectionOptions } from '@/db/data-source';
import { DB_SCHEMA } from '@/env';

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
  ],
  exports: [TypeOrmModule],
})
export class DbModule {}
