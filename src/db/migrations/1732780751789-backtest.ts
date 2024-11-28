import { MigrationInterface, QueryRunner } from 'typeorm';

export class Backtest1732780751789 implements MigrationInterface {
  name = 'Backtest1732780751789';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP INDEX "st"."IDX_36730ed80e30201361a6ae2be3"
    `);
    await queryRunner.query(`
        CREATE TABLE "st"."backtest_strategy"
        (
            "id"                 SERIAL            NOT NULL,
            "created_at"         TIMESTAMP         NOT NULL DEFAULT now(),
            "deleted_at"         TIMESTAMP,
            "ex"                 character varying NOT NULL,
            "market"             character varying NOT NULL,
            "base_coin"          character varying NOT NULL,
            "symbol"             character varying NOT NULL,
            "raw_symbol"         character varying NOT NULL,
            "algo_code"          character varying NOT NULL,
            "name"               character varying NOT NULL,
            "open_algo"          character varying,
            "close_algo"         character varying,
            "open_deal_side"     character varying,
            "user_ex_account_id" integer           NOT NULL,
            "trade_type"         character varying NOT NULL,
            "current_deal_id"    integer,
            "last_deal_id"       integer,
            "base_size"          numeric,
            "quote_amount"       numeric,
            "active"             boolean           NOT NULL,
            "params"             jsonb,
            "paper_trade"        boolean,
            "job_summited"       boolean,
            CONSTRAINT "PK_1b1fea3eb025fdb2b142a79275d" PRIMARY KEY ("id")
        )
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_151234faef2b5b7d45196dce77" ON "st"."backtest_strategy" ("created_at")
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_2690738be047431276195dbe0a" ON "st"."backtest_strategy" ("symbol")
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_6af8a44aa4bbe36747d22d1e06" ON "st"."backtest_strategy" ("raw_symbol")
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_fa20a6e7779dd9edba4d907b66" ON "st"."backtest_strategy" ("user_ex_account_id")
    `);
    await queryRunner.query(`
        CREATE TABLE "st"."backtest_deal"
        (
            "id"                 SERIAL            NOT NULL,
            "created_at"         TIMESTAMP         NOT NULL DEFAULT now(),
            "deleted_at"         TIMESTAMP,
            "ex"                 character varying NOT NULL,
            "market"             character varying NOT NULL,
            "base_coin"          character varying NOT NULL,
            "symbol"             character varying NOT NULL,
            "raw_symbol"         character varying NOT NULL,
            "strategy_id"        integer           NOT NULL,
            "user_ex_account_id" integer           NOT NULL,
            "trade_type"         character varying NOT NULL,
            "pending_order_id"   integer,
            "last_order_id"      integer,
            "pnl_usd"            numeric,
            "status"             character varying NOT NULL,
            "params"             jsonb,
            "paper_trade"        boolean,
            "closed_at"          TIMESTAMP,
            "task_id"            integer           NOT NULL,
            CONSTRAINT "PK_ca3ec9e7bd4983e10350bd25c17" PRIMARY KEY ("id")
        )
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_c0cac864a021a6d2af4e7d85d3" ON "st"."backtest_deal" ("created_at")
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_2b7c53f134a0611f5a9122911c" ON "st"."backtest_deal" ("symbol")
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_8893cfe135ce146ff0573377c6" ON "st"."backtest_deal" ("raw_symbol")
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_8ad0dd61b5ae2f2a8998dcc08b" ON "st"."backtest_deal" ("strategy_id")
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_40b901f43bddbc19899d2509de" ON "st"."backtest_deal" ("user_ex_account_id")
    `);
    await queryRunner.query(`
        CREATE TABLE "st"."backtest_task"
        (
            "id"              SERIAL    NOT NULL,
            "created_at"      TIMESTAMP NOT NULL DEFAULT now(),
            "deleted_at"      TIMESTAMP,
            "strategy_id"     integer   NOT NULL,
            "data_start_date" character varying,
            "data_end_date"   character varying,
            "started_at"      TIMESTAMP,
            "completed_at"    TIMESTAMP,
            "job_summited"    boolean,
            CONSTRAINT "PK_beaf7594c166a5d43f8ac591caf" PRIMARY KEY ("id")
        )
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_a0a418c939bb7470c21656715a" ON "st"."backtest_task" ("created_at")
    `);
    await queryRunner.query(`
        CREATE TABLE "st"."backtest_order"
        (
            "id"                    SERIAL            NOT NULL,
            "created_at"            TIMESTAMP         NOT NULL DEFAULT now(),
            "deleted_at"            TIMESTAMP,
            "ex"                    character varying NOT NULL,
            "market"                character varying NOT NULL,
            "base_coin"             character varying NOT NULL,
            "symbol"                character varying NOT NULL,
            "raw_symbol"            character varying NOT NULL,
            "user_ex_account_id"    integer           NOT NULL,
            "strategy_id"           integer,
            "deal_id"               integer,
            "tag"                   character varying,
            "side"                  character varying NOT NULL,
            "trade_type"            character varying,
            "time_type"             character varying,
            "status"                character varying NOT NULL,
            "client_order_id"       character varying,
            "price_type"            character varying NOT NULL,
            "limit_price"           numeric,
            "base_size"             numeric,
            "quote_amount"          numeric,
            "reduce_only"           boolean,
            "algo_order"            boolean           NOT NULL,
            "tpsl_type"             character varying,
            "tpsl_client_order_id"  character varying,
            "tp_trigger_price"      numeric,
            "tp_order_price"        numeric,
            "sl_trigger_price"      numeric,
            "sl_order_price"        numeric,
            "move_drawback_percent" numeric,
            "move_active_price"     numeric,
            "paper_trade"           boolean,
            "ex_order_id"           character varying,
            "exec_price"            numeric,
            "exec_size"             numeric,
            "exec_amount"           numeric,
            "ex_created_at"         TIMESTAMP,
            "ex_updated_at"         TIMESTAMP,
            "raw_order_params"      jsonb,
            "raw_order"             jsonb,
            "task_id"               integer           NOT NULL,
            CONSTRAINT "UQ_eb2211577d5fa18b51a259f4026" UNIQUE ("ex", "client_order_id"),
            CONSTRAINT "UQ_c6d93afd79d0b14890eccb585d1" UNIQUE ("ex", "ex_order_id"),
            CONSTRAINT "PK_035ce656bf1329134d25fcd40cb" PRIMARY KEY ("id")
        )
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_b9cecb5927fa6c9746e349272e" ON "st"."backtest_order" ("created_at")
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_f1279b250160e9744e939be6d2" ON "st"."backtest_order" ("symbol")
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_d6833378fac32eb5c677326da7" ON "st"."backtest_order" ("raw_symbol")
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_7b6f81affc70dd4f62e0b3d80c" ON "st"."backtest_order" ("user_ex_account_id")
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_feee76afa549322f0b74968448" ON "st"."backtest_order" ("strategy_id")
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_fa3b5273d11d591dce7db26d57" ON "st"."backtest_order" ("deal_id")
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_94cb9db57739a068e42b1e65a7" ON "st"."backtest_order" ("client_order_id")
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_62f56d6c43781261caeb4586c7" ON "st"."backtest_order" ("ex_order_id")
    `);
    await queryRunner.query(`
        ALTER TABLE "st"."strategy_deal"
            DROP COLUMN "exec_info"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "st"."strategy_deal"
            ADD "exec_info" jsonb
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_62f56d6c43781261caeb4586c7"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_94cb9db57739a068e42b1e65a7"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_fa3b5273d11d591dce7db26d57"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_feee76afa549322f0b74968448"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_7b6f81affc70dd4f62e0b3d80c"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_d6833378fac32eb5c677326da7"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_f1279b250160e9744e939be6d2"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_b9cecb5927fa6c9746e349272e"
    `);
    await queryRunner.query(`
        DROP TABLE "st"."backtest_order"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_a0a418c939bb7470c21656715a"
    `);
    await queryRunner.query(`
        DROP TABLE "st"."backtest_task"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_40b901f43bddbc19899d2509de"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_8ad0dd61b5ae2f2a8998dcc08b"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_8893cfe135ce146ff0573377c6"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_2b7c53f134a0611f5a9122911c"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_c0cac864a021a6d2af4e7d85d3"
    `);
    await queryRunner.query(`
        DROP TABLE "st"."backtest_deal"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_fa20a6e7779dd9edba4d907b66"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_6af8a44aa4bbe36747d22d1e06"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_2690738be047431276195dbe0a"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_151234faef2b5b7d45196dce77"
    `);
    await queryRunner.query(`
        DROP TABLE "st"."backtest_strategy"
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_36730ed80e30201361a6ae2be3" ON "st"."strategy_template" ("code")
    `);
  }

}
