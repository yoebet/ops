import { MigrationInterface, QueryRunner } from "typeorm";

export class Tables1725243371336 implements MigrationInterface {
    name = 'Tables1725243371336'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "t_user" (
                "id" character varying(64) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "user_id" character varying NOT NULL,
                "bs" character varying,
                "plan" character varying,
                "role" character varying,
                "memo" character varying,
                "ext" jsonb,
                CONSTRAINT "UQ_dc2155d746d6b96b748d4833762" UNIQUE ("user_id"),
                CONSTRAINT "PK_6a6708d647ac5da9ab8271cfede" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_cb6343ed12bb9861c19f168a6f" ON "t_user" ("created_at")
        `);
        await queryRunner.query(`
            CREATE TABLE "t_time_level" (
                "id" character varying(64) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "interval" character varying NOT NULL,
                "interval_seconds" integer NOT NULL,
                "visible_to_client" boolean NOT NULL DEFAULT true,
                "prl_from" integer NOT NULL,
                "prl_to" integer NOT NULL,
                "rollup_from_interval" character varying,
                CONSTRAINT "PK_d53643fc9a531c9a8edb69a92cd" PRIMARY KEY ("id")
            );
            COMMENT ON COLUMN "t_time_level"."prl_from" IS 'tick 倍数';
            COMMENT ON COLUMN "t_time_level"."prl_to" IS 'tick 倍数';
            COMMENT ON COLUMN "t_time_level"."rollup_from_interval" IS '从哪一级汇总数据'
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_05349fcda7c9660c9e2a0b23d8" ON "t_time_level" ("created_at")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_5c6088ad7056e3ce243fa68cf1" ON "t_time_level" ("interval")
        `);
        await queryRunner.query(`
            CREATE TABLE "t_sys_config" (
                "id" character varying(64) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "scope" character varying NOT NULL,
                "key" character varying NOT NULL,
                "value" character varying NOT NULL,
                "value_type" character varying NOT NULL,
                CONSTRAINT "PK_8786ff3b45981c8c1df2f510649" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_b5d1fb41a24d6bb97d3fda11ce" ON "t_sys_config" ("created_at")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_b08b9838bc8cd1f001dfa87eda" ON "t_sys_config" ("scope", "key")
        `);
        await queryRunner.query(`
            CREATE TABLE "t_user_setting" (
                "id" character varying(64) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "user_id" character varying NOT NULL,
                "cat" character varying NOT NULL,
                "scope" character varying NOT NULL,
                "key" character varying NOT NULL,
                "memo" character varying,
                "digest" jsonb,
                "content" jsonb NOT NULL,
                CONSTRAINT "PK_4d0aba35a112bac26f58f6692b4" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_65296d7013140381a7574b905f" ON "t_user_setting" ("created_at")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_1feb248c4037c7548894bfaed1" ON "t_user_setting" ("user_id", "cat", "scope", "key")
        `);
        await queryRunner.query(`
            CREATE TABLE "t_symbol_config" (
                "id" character varying(64) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "symbol" character varying NOT NULL,
                "market" character varying NOT NULL,
                "base" character varying NOT NULL,
                "quote" character varying NOT NULL,
                "settle" character varying,
                "price_tick_str" character varying NOT NULL,
                "enabled" boolean NOT NULL DEFAULT true,
                "display_order" integer NOT NULL DEFAULT '0',
                "visible_to_client" boolean NOT NULL DEFAULT true,
                "size_ticker" numeric NOT NULL DEFAULT '1',
                "amount_ticker" numeric NOT NULL DEFAULT '1',
                CONSTRAINT "PK_4bd96a1f6b93f8852dcd66704c3" PRIMARY KEY ("id")
            );
            COMMENT ON COLUMN "t_symbol_config"."price_tick_str" IS '价格精度'
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_73530e480e79e3f0474fcc562f" ON "t_symbol_config" ("created_at")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_d8781ae1da3b1a43f52937c689" ON "t_symbol_config" ("symbol")
        `);
        await queryRunner.query(`
            CREATE TABLE "t_exchange_symbol" (
                "id" character varying(64) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "ex" character varying NOT NULL,
                "ex_account" character varying NOT NULL,
                "symbol" character varying NOT NULL,
                "raw_symbol" character varying NOT NULL,
                "price_tick_str" character varying NOT NULL,
                "enabled" boolean NOT NULL DEFAULT true,
                "contract_size_str" character varying,
                "display_order" integer NOT NULL DEFAULT '0',
                "visible_to_client" boolean NOT NULL DEFAULT true,
                CONSTRAINT "PK_a3deedaacce212ccc3554bde8b5" PRIMARY KEY ("id")
            );
            COMMENT ON COLUMN "t_exchange_symbol"."raw_symbol" IS '交易所 symbol';
            COMMENT ON COLUMN "t_exchange_symbol"."price_tick_str" IS '价格精度';
            COMMENT ON COLUMN "t_exchange_symbol"."contract_size_str" IS 'ws接口中 交易数量与币的比例：比如 1=0.1个币 这里就填 0.1;反向合约 1=100U:这里就填100'
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_699f351784f089aeb54ec6deb1" ON "t_exchange_symbol" ("created_at")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_7c8137b2438b2954333c0825b9" ON "t_exchange_symbol" ("ex_account", "symbol")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_2d58b2c0efb0191aae64daa8ce" ON "t_exchange_symbol" ("ex", "symbol")
        `);
        await queryRunner.query(`
            CREATE TABLE "t_server_instance_log" (
                "id" character varying(64) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "node_id" character varying NOT NULL,
                "profile_name" character varying,
                "profile" jsonb,
                "git_branch" character varying,
                "git_sha" character varying,
                "git_commit_at" character varying,
                "started_at" TIMESTAMP NOT NULL,
                "stopped_at" TIMESTAMP,
                "stop_style" character varying,
                CONSTRAINT "PK_36a0ee5acc995899932c2a7f943" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_270dea6db0f9b6ffa189c99828" ON "t_server_instance_log" ("created_at")
        `);
        await queryRunner.query(`
            CREATE TABLE "t_ex_trade_symbol_task" (
                "id" character varying(64) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "ex" character varying NOT NULL,
                "ex_account" character varying NOT NULL,
                "patched_count" integer NOT NULL DEFAULT '0',
                "status" character varying NOT NULL DEFAULT 'pending',
                "err_msg" character varying,
                "started_at" TIMESTAMP,
                "finished_at" TIMESTAMP,
                "trade_task_id" character varying NOT NULL,
                "symbol" character varying NOT NULL,
                "last_trade" jsonb,
                "resume_trade" jsonb,
                "patch_from_trade" jsonb,
                "patch_to_trade" jsonb,
                "fetch_times" integer NOT NULL DEFAULT '0',
                CONSTRAINT "PK_de8db57b4cb61fc339ea5a23356" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_753f87de52861ac9ff13e2bbde" ON "t_ex_trade_symbol_task" ("created_at")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_cf000b7486618b7e6f1653d5b1" ON "t_ex_trade_symbol_task" ("trade_task_id", "symbol")
        `);
        await queryRunner.query(`
            CREATE TABLE "t_exchange_config" (
                "id" character varying(64) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "ex" character varying NOT NULL,
                "name" character varying NOT NULL,
                "enabled" boolean NOT NULL DEFAULT true,
                "display_order" integer NOT NULL DEFAULT '0',
                "visible_to_client" boolean NOT NULL DEFAULT true,
                CONSTRAINT "PK_f7d8aa9779eb06c734bb34b5eed" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_eb628bc482c44934c852de97ca" ON "t_exchange_config" ("created_at")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_a4fd7631dd9499b868a3ab61d3" ON "t_exchange_config" ("ex")
        `);
        await queryRunner.query(`
            CREATE TABLE "t_coin_config" (
                "id" character varying(64) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "coin" character varying NOT NULL,
                "name" character varying,
                "display_order" integer NOT NULL DEFAULT '0',
                "volume_small_max" character varying,
                "volume_big_min" character varying,
                "usd_volume_small_max" character varying,
                "usd_volume_big_min" character varying,
                CONSTRAINT "PK_f15c185c31ac9fd35a5b1328357" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_269e60c70c1c01089f819b56a0" ON "t_coin_config" ("created_at")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_e5864bd91c476ef28a75f7182f" ON "t_coin_config" ("coin")
        `);
        await queryRunner.query(`
            CREATE TABLE "t_ex_trade_task" (
                "id" character varying(64) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "ex" character varying NOT NULL,
                "ex_account" character varying NOT NULL,
                "patched_count" integer NOT NULL DEFAULT '0',
                "status" character varying NOT NULL DEFAULT 'pending',
                "err_msg" character varying,
                "started_at" TIMESTAMP,
                "finished_at" TIMESTAMP,
                "key" character varying NOT NULL,
                "symbols" text array,
                "last_trade" jsonb,
                "resume_trade" jsonb,
                CONSTRAINT "PK_029ea81a923ee14ef2f5eeec80f" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_dc0a0b83c329382af906e6494d" ON "t_ex_trade_task" ("created_at")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_19ab4174088858eab9f31e69bf" ON "t_ex_trade_task" ("ex_account", "key")
        `);
        await queryRunner.query(`
            ALTER TABLE "t_exchange_symbol"
            ADD CONSTRAINT "FK_9d0afb8df2e4af5e58904e804d3" FOREIGN KEY ("symbol") REFERENCES "t_symbol_config"("symbol") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "t_exchange_symbol" DROP CONSTRAINT "FK_9d0afb8df2e4af5e58904e804d3"
        `);
        await queryRunner.query(`
            DROP INDEX "tm"."IDX_19ab4174088858eab9f31e69bf"
        `);
        await queryRunner.query(`
            DROP INDEX "tm"."IDX_dc0a0b83c329382af906e6494d"
        `);
        await queryRunner.query(`
            DROP TABLE "t_ex_trade_task"
        `);
        await queryRunner.query(`
            DROP INDEX "tm"."IDX_e5864bd91c476ef28a75f7182f"
        `);
        await queryRunner.query(`
            DROP INDEX "tm"."IDX_269e60c70c1c01089f819b56a0"
        `);
        await queryRunner.query(`
            DROP TABLE "t_coin_config"
        `);
        await queryRunner.query(`
            DROP INDEX "tm"."IDX_a4fd7631dd9499b868a3ab61d3"
        `);
        await queryRunner.query(`
            DROP INDEX "tm"."IDX_eb628bc482c44934c852de97ca"
        `);
        await queryRunner.query(`
            DROP TABLE "t_exchange_config"
        `);
        await queryRunner.query(`
            DROP INDEX "tm"."IDX_cf000b7486618b7e6f1653d5b1"
        `);
        await queryRunner.query(`
            DROP INDEX "tm"."IDX_753f87de52861ac9ff13e2bbde"
        `);
        await queryRunner.query(`
            DROP TABLE "t_ex_trade_symbol_task"
        `);
        await queryRunner.query(`
            DROP INDEX "tm"."IDX_270dea6db0f9b6ffa189c99828"
        `);
        await queryRunner.query(`
            DROP TABLE "t_server_instance_log"
        `);
        await queryRunner.query(`
            DROP INDEX "tm"."IDX_2d58b2c0efb0191aae64daa8ce"
        `);
        await queryRunner.query(`
            DROP INDEX "tm"."IDX_7c8137b2438b2954333c0825b9"
        `);
        await queryRunner.query(`
            DROP INDEX "tm"."IDX_699f351784f089aeb54ec6deb1"
        `);
        await queryRunner.query(`
            DROP TABLE "t_exchange_symbol"
        `);
        await queryRunner.query(`
            DROP INDEX "tm"."IDX_d8781ae1da3b1a43f52937c689"
        `);
        await queryRunner.query(`
            DROP INDEX "tm"."IDX_73530e480e79e3f0474fcc562f"
        `);
        await queryRunner.query(`
            DROP TABLE "t_symbol_config"
        `);
        await queryRunner.query(`
            DROP INDEX "tm"."IDX_1feb248c4037c7548894bfaed1"
        `);
        await queryRunner.query(`
            DROP INDEX "tm"."IDX_65296d7013140381a7574b905f"
        `);
        await queryRunner.query(`
            DROP TABLE "t_user_setting"
        `);
        await queryRunner.query(`
            DROP INDEX "tm"."IDX_b08b9838bc8cd1f001dfa87eda"
        `);
        await queryRunner.query(`
            DROP INDEX "tm"."IDX_b5d1fb41a24d6bb97d3fda11ce"
        `);
        await queryRunner.query(`
            DROP TABLE "t_sys_config"
        `);
        await queryRunner.query(`
            DROP INDEX "tm"."IDX_5c6088ad7056e3ce243fa68cf1"
        `);
        await queryRunner.query(`
            DROP INDEX "tm"."IDX_05349fcda7c9660c9e2a0b23d8"
        `);
        await queryRunner.query(`
            DROP TABLE "t_time_level"
        `);
        await queryRunner.query(`
            DROP INDEX "tm"."IDX_cb6343ed12bb9861c19f168a6f"
        `);
        await queryRunner.query(`
            DROP TABLE "t_user"
        `);
    }

}
