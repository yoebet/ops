import { MigrationInterface, QueryRunner } from "typeorm";

export class M11735729942145 implements MigrationInterface {
    name = 'M11735729942145'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "st"."unified_symbol" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "symbol" character varying NOT NULL,
                "market" character varying NOT NULL,
                "base" character varying NOT NULL,
                "quote" character varying NOT NULL,
                "settle" character varying,
                CONSTRAINT "PK_25725b3bd096048ee754222acd4" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_17304a78f571208b88fc0d5a18" ON "st"."unified_symbol" ("created_at")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_75994a9e9ba7db0ff0f26194be" ON "st"."unified_symbol" ("symbol")
        `);
        await queryRunner.query(`
            CREATE TABLE "st"."ex_data_loader_task" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "ex" character varying NOT NULL,
                "market" character varying NOT NULL,
                "symbol" character varying NOT NULL,
                "raw_symbol" character varying NOT NULL,
                "interval" character varying NOT NULL,
                "task_type" character varying NOT NULL,
                "data_type" character varying NOT NULL,
                "params" jsonb,
                "start_date" character varying,
                "end_date" character varying,
                "last_date" character varying,
                "status" character varying NOT NULL DEFAULT 'pending',
                "completed_at" TIMESTAMP,
                CONSTRAINT "PK_e0a7efb334a54bd9460bf784439" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_ac996738a2c240bd590df9603c" ON "st"."ex_data_loader_task" ("created_at")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_7cbf0ab9a10775294e0f42a72c" ON "st"."ex_data_loader_task" (
                "ex",
                "symbol",
                "interval",
                "start_date",
                "end_date"
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "st"."ex_order" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "ex" character varying NOT NULL,
                "market" character varying NOT NULL,
                "base_coin" character varying NOT NULL,
                "symbol" character varying NOT NULL,
                "raw_symbol" character varying NOT NULL,
                "user_ex_account_id" integer NOT NULL,
                "strategy_id" integer,
                "deal_id" integer,
                "tag" character varying,
                "side" character varying NOT NULL,
                "trade_type" character varying,
                "time_type" character varying,
                "status" character varying NOT NULL,
                "client_order_id" character varying,
                "price_type" character varying NOT NULL,
                "limit_price" numeric,
                "cancel_price" numeric,
                "base_size" numeric,
                "quote_amount" numeric,
                "reduce_only" boolean,
                "algo_order" boolean NOT NULL,
                "tpsl_type" character varying,
                "tpsl_client_order_id" character varying,
                "tp_trigger_price" numeric,
                "tp_order_price" numeric,
                "sl_trigger_price" numeric,
                "sl_order_price" numeric,
                "move_drawback_percent" numeric,
                "move_active_price" numeric,
                "paper_trade" boolean,
                "ex_order_id" character varying,
                "exec_price" numeric,
                "exec_size" numeric,
                "exec_amount" numeric,
                "ex_created_at" TIMESTAMP,
                "ex_updated_at" TIMESTAMP,
                "raw_order_params" jsonb,
                "raw_order" jsonb,
                "memo" character varying,
                CONSTRAINT "UQ_a59342e9f9af303b7439adce2de" UNIQUE ("ex", "client_order_id"),
                CONSTRAINT "UQ_ab3529eeeb629b12d67eb187ddc" UNIQUE ("ex", "ex_order_id"),
                CONSTRAINT "PK_ad5b16350c6c56e88cd5bf99afc" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_8a56f478ba111a75b47e29a8ca" ON "st"."ex_order" ("created_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_b25bc1c793c53b740ccc2792aa" ON "st"."ex_order" ("symbol")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_fb40b8e4a4792a3617ad7bcdcc" ON "st"."ex_order" ("raw_symbol")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_52328c7538a5a4e2d6a7373290" ON "st"."ex_order" ("user_ex_account_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_f8beb5a7ddfab011c1a7b051bb" ON "st"."ex_order" ("strategy_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_23ed1bb586432f62c75fabd494" ON "st"."ex_order" ("deal_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_ffc7209b86c1b3beb17f2a8e08" ON "st"."ex_order" ("client_order_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_4c137df06e37f2031c4f10fb47" ON "st"."ex_order" ("ex_order_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "st"."ex_asset_snapshot_coin" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "time" TIMESTAMP NOT NULL,
                "snapshot_id" integer NOT NULL,
                "user_ex_account_id" integer NOT NULL,
                "ex" character varying NOT NULL,
                "account_type" character varying NOT NULL,
                "coin" character varying NOT NULL,
                "eq" numeric,
                "eq_usd" numeric,
                "avail_bal" numeric NOT NULL,
                "frozen_bal" numeric NOT NULL,
                "ord_frozen" numeric,
                CONSTRAINT "UQ_c41dac629e4409f9ea50b8a5a2a" UNIQUE (
                    "time",
                    "user_ex_account_id",
                    "account_type",
                    "coin"
                ),
                CONSTRAINT "UQ_fd9b878bd538c19043a98b4077e" UNIQUE ("snapshot_id", "coin"),
                CONSTRAINT "PK_d8343220240286e0c3e4bec7788" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_6c050cb4050938940254d25db9" ON "st"."ex_asset_snapshot_coin" ("created_at")
        `);
        await queryRunner.query(`
            CREATE TABLE "st"."ex_asset_snapshot" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "time" TIMESTAMP NOT NULL,
                "user_ex_account_id" integer NOT NULL,
                "ex" character varying NOT NULL,
                "account_type" character varying NOT NULL,
                "total_eq_usd" numeric,
                CONSTRAINT "UQ_9e3170222eb1dda35fefc567dea" UNIQUE ("time", "user_ex_account_id", "account_type"),
                CONSTRAINT "PK_c66c639f4876b89626553de37e7" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_a19adf31891381b95eeaf673cf" ON "st"."ex_asset_snapshot" ("created_at")
        `);
        await queryRunner.query(`
            CREATE TABLE "st"."user" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "username" character varying NOT NULL,
                "password" character varying NOT NULL,
                "role" character varying,
                "email" character varying,
                CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"),
                CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_d091f1d36f18bbece2a9eabc6e" ON "st"."user" ("created_at")
        `);
        await queryRunner.query(`
            CREATE TABLE "st"."user_ex_account" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "user_id" integer NOT NULL,
                "ex" character varying NOT NULL,
                "name" character varying NOT NULL,
                "apikey_key" character varying NOT NULL,
                "apikey_secret" character varying NOT NULL,
                "apikey_password" character varying,
                "apikey_label" character varying,
                CONSTRAINT "PK_b470e8e840702d51a56c2c4c1e0" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_70d4d5d49992161edc3d589e21" ON "st"."user_ex_account" ("created_at")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_919db3233e2258993bc280326b" ON "st"."user_ex_account" ("apikey_key")
        `);
        await queryRunner.query(`
            CREATE TABLE "st"."instance_log" (
                "id" SERIAL NOT NULL,
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
                CONSTRAINT "PK_49b0f0e2240a2e5583ce70a778d" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2b006e37cec90b243d3d4ff212" ON "st"."instance_log" ("created_at")
        `);
        await queryRunner.query(`
            CREATE TABLE "st"."sys_config" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "scope" character varying NOT NULL,
                "key" character varying NOT NULL,
                "value" character varying NOT NULL,
                "value_type" character varying NOT NULL,
                CONSTRAINT "PK_8791cee36df4c4d04a9acffed27" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_763ff2d867cd3fc26c71b04fe7" ON "st"."sys_config" ("created_at")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_598e37fd646ca26ba7097d3b69" ON "st"."sys_config" ("scope", "key")
        `);
        await queryRunner.query(`
            CREATE TABLE "st"."strategy_template" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "name" character varying NOT NULL,
                "code" character varying NOT NULL,
                "open_algo" character varying,
                "close_algo" character varying,
                "open_deal_side" character varying,
                "trade_type" character varying,
                "quote_amount" numeric,
                "params" jsonb,
                "memo" character varying,
                CONSTRAINT "PK_f770cf55db32113b3214819e6c2" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_c5c7297f68e2c015d1601ac7bc" ON "st"."strategy_template" ("created_at")
        `);
        await queryRunner.query(`
            CREATE TABLE "st"."strategy_deal" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "ex" character varying NOT NULL,
                "market" character varying NOT NULL,
                "base_coin" character varying NOT NULL,
                "symbol" character varying NOT NULL,
                "raw_symbol" character varying NOT NULL,
                "strategy_id" integer NOT NULL,
                "user_ex_account_id" integer NOT NULL,
                "trade_type" character varying NOT NULL,
                "pending_order_id" integer,
                "last_order_id" integer,
                "pnl_usd" numeric,
                "status" character varying NOT NULL,
                "paper_trade" boolean,
                "open_at" TIMESTAMP,
                "closed_at" TIMESTAMP,
                "deal_duration" character varying,
                "close_reason" character varying,
                "orders_count" integer,
                CONSTRAINT "PK_4e4ae3755a6c752e8548df67cb9" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_0c2d5ad009f41f88bb9f22607f" ON "st"."strategy_deal" ("created_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_7ad59e2f4b17445af23d9b4064" ON "st"."strategy_deal" ("symbol")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_dd8a8536fbe20136d70782b0d8" ON "st"."strategy_deal" ("raw_symbol")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_07f7b939c3ce26cdf576bdfc71" ON "st"."strategy_deal" ("strategy_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_ccf9299972d261bebb345e2198" ON "st"."strategy_deal" ("user_ex_account_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "st"."strategy" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "ex" character varying NOT NULL,
                "market" character varying NOT NULL,
                "base_coin" character varying NOT NULL,
                "symbol" character varying NOT NULL,
                "raw_symbol" character varying NOT NULL,
                "algo_code" character varying NOT NULL,
                "name" character varying NOT NULL,
                "open_algo" character varying,
                "close_algo" character varying,
                "open_deal_side" character varying,
                "user_ex_account_id" integer NOT NULL,
                "trade_type" character varying NOT NULL,
                "current_deal_id" integer,
                "last_deal_id" integer,
                "base_size" numeric,
                "quote_amount" numeric,
                "active" boolean NOT NULL,
                "params" jsonb,
                "paper_trade" boolean,
                "job_summited" boolean,
                "memo" character varying,
                CONSTRAINT "PK_733d2c3d4a73c020375b9b3581d" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_df547b21e7285516ac0b324efa" ON "st"."strategy" ("created_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_0122eb1eee7f561f58d75cf526" ON "st"."strategy" ("symbol")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_02e717fda294449597e60ed08d" ON "st"."strategy" ("raw_symbol")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_6e53431e775fd6232248d7f7e0" ON "st"."strategy" ("user_ex_account_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "st"."backtest_strategy" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "ex" character varying NOT NULL,
                "market" character varying NOT NULL,
                "base_coin" character varying NOT NULL,
                "symbol" character varying NOT NULL,
                "raw_symbol" character varying NOT NULL,
                "algo_code" character varying NOT NULL,
                "name" character varying NOT NULL,
                "open_algo" character varying,
                "close_algo" character varying,
                "open_deal_side" character varying,
                "user_ex_account_id" integer NOT NULL,
                "trade_type" character varying NOT NULL,
                "current_deal_id" integer,
                "last_deal_id" integer,
                "base_size" numeric,
                "quote_amount" numeric,
                "active" boolean NOT NULL,
                "params" jsonb,
                "paper_trade" boolean,
                "job_summited" boolean,
                "memo" character varying,
                "data_from" character varying NOT NULL,
                "data_to" character varying NOT NULL,
                "started_at" TIMESTAMP,
                "completed_at" TIMESTAMP,
                CONSTRAINT "PK_5b8bb294d55632a118777e6e084" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_29223442177bbf8fe133156f1a" ON "st"."backtest_strategy" ("created_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_16d7445d046188748edcf0e5b0" ON "st"."backtest_strategy" ("symbol")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_07e605a6dd06dc0cc0e7cbc157" ON "st"."backtest_strategy" ("raw_symbol")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_4881c5897a6a94bd498f2c6234" ON "st"."backtest_strategy" ("user_ex_account_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "st"."backtest_order" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "ex" character varying NOT NULL,
                "market" character varying NOT NULL,
                "base_coin" character varying NOT NULL,
                "symbol" character varying NOT NULL,
                "raw_symbol" character varying NOT NULL,
                "user_ex_account_id" integer NOT NULL,
                "strategy_id" integer,
                "deal_id" integer,
                "tag" character varying,
                "side" character varying NOT NULL,
                "trade_type" character varying,
                "time_type" character varying,
                "status" character varying NOT NULL,
                "client_order_id" character varying,
                "price_type" character varying NOT NULL,
                "limit_price" numeric,
                "cancel_price" numeric,
                "base_size" numeric,
                "quote_amount" numeric,
                "reduce_only" boolean,
                "algo_order" boolean NOT NULL,
                "tpsl_type" character varying,
                "tpsl_client_order_id" character varying,
                "tp_trigger_price" numeric,
                "tp_order_price" numeric,
                "sl_trigger_price" numeric,
                "sl_order_price" numeric,
                "move_drawback_percent" numeric,
                "move_active_price" numeric,
                "paper_trade" boolean,
                "ex_order_id" character varying,
                "exec_price" numeric,
                "exec_size" numeric,
                "exec_amount" numeric,
                "ex_created_at" TIMESTAMP,
                "ex_updated_at" TIMESTAMP,
                "raw_order_params" jsonb,
                "raw_order" jsonb,
                "memo" character varying,
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
            CREATE TABLE "st"."backtest_deal" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "ex" character varying NOT NULL,
                "market" character varying NOT NULL,
                "base_coin" character varying NOT NULL,
                "symbol" character varying NOT NULL,
                "raw_symbol" character varying NOT NULL,
                "strategy_id" integer NOT NULL,
                "user_ex_account_id" integer NOT NULL,
                "trade_type" character varying NOT NULL,
                "pending_order_id" integer,
                "last_order_id" integer,
                "pnl_usd" numeric,
                "status" character varying NOT NULL,
                "paper_trade" boolean,
                "open_at" TIMESTAMP,
                "closed_at" TIMESTAMP,
                "deal_duration" character varying,
                "close_reason" character varying,
                "orders_count" integer,
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
            CREATE TABLE "st"."coin" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "coin" character varying NOT NULL,
                "name" character varying,
                "stable" boolean NOT NULL DEFAULT false,
                "display_order" integer NOT NULL DEFAULT '0',
                CONSTRAINT "PK_650993fc71b789e4793b62fbcac" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_bca088c4a56359e3b7c0fd3e8c" ON "st"."coin" ("created_at")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_4b9e82139806743fe4ddb64c30" ON "st"."coin" ("coin")
        `);
        await queryRunner.query(`
            CREATE TABLE "st"."exchange_symbol" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "ex" character varying NOT NULL,
                "market" character varying NOT NULL DEFAULT 'spot',
                "symbol" character varying NOT NULL,
                "raw_symbol" character varying NOT NULL,
                "price_digits" smallint,
                "base_size_digits" smallint,
                "exchange_info" jsonb,
                CONSTRAINT "PK_31e154ea075fa008a875a510d18" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_ce418fe8e8cd8952b8995bfb1b" ON "st"."exchange_symbol" ("created_at")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_68e33073b90b2ab84a7e04940b" ON "st"."exchange_symbol" ("ex", "market", "raw_symbol")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_f51eefe300102dbbb0d3150983" ON "st"."exchange_symbol" ("ex", "symbol")
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_data_loader_task"
            ADD CONSTRAINT "FK_c31ecf0705bc33f3b7a06f2315f" FOREIGN KEY ("symbol") REFERENCES "st"."unified_symbol"("symbol") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."exchange_symbol"
            ADD CONSTRAINT "FK_90eb17ec70e29e1e2bb3782893a" FOREIGN KEY ("symbol") REFERENCES "st"."unified_symbol"("symbol") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."exchange_symbol" DROP CONSTRAINT "FK_90eb17ec70e29e1e2bb3782893a"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_data_loader_task" DROP CONSTRAINT "FK_c31ecf0705bc33f3b7a06f2315f"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_f51eefe300102dbbb0d3150983"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_68e33073b90b2ab84a7e04940b"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_ce418fe8e8cd8952b8995bfb1b"
        `);
        await queryRunner.query(`
            DROP TABLE "st"."exchange_symbol"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_4b9e82139806743fe4ddb64c30"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_bca088c4a56359e3b7c0fd3e8c"
        `);
        await queryRunner.query(`
            DROP TABLE "st"."coin"
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
            DROP INDEX "st"."IDX_4881c5897a6a94bd498f2c6234"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_07e605a6dd06dc0cc0e7cbc157"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_16d7445d046188748edcf0e5b0"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_29223442177bbf8fe133156f1a"
        `);
        await queryRunner.query(`
            DROP TABLE "st"."backtest_strategy"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_6e53431e775fd6232248d7f7e0"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_02e717fda294449597e60ed08d"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_0122eb1eee7f561f58d75cf526"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_df547b21e7285516ac0b324efa"
        `);
        await queryRunner.query(`
            DROP TABLE "st"."strategy"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_ccf9299972d261bebb345e2198"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_07f7b939c3ce26cdf576bdfc71"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_dd8a8536fbe20136d70782b0d8"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_7ad59e2f4b17445af23d9b4064"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_0c2d5ad009f41f88bb9f22607f"
        `);
        await queryRunner.query(`
            DROP TABLE "st"."strategy_deal"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_c5c7297f68e2c015d1601ac7bc"
        `);
        await queryRunner.query(`
            DROP TABLE "st"."strategy_template"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_598e37fd646ca26ba7097d3b69"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_763ff2d867cd3fc26c71b04fe7"
        `);
        await queryRunner.query(`
            DROP TABLE "st"."sys_config"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_2b006e37cec90b243d3d4ff212"
        `);
        await queryRunner.query(`
            DROP TABLE "st"."instance_log"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_919db3233e2258993bc280326b"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_70d4d5d49992161edc3d589e21"
        `);
        await queryRunner.query(`
            DROP TABLE "st"."user_ex_account"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_d091f1d36f18bbece2a9eabc6e"
        `);
        await queryRunner.query(`
            DROP TABLE "st"."user"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_a19adf31891381b95eeaf673cf"
        `);
        await queryRunner.query(`
            DROP TABLE "st"."ex_asset_snapshot"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_6c050cb4050938940254d25db9"
        `);
        await queryRunner.query(`
            DROP TABLE "st"."ex_asset_snapshot_coin"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_4c137df06e37f2031c4f10fb47"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_ffc7209b86c1b3beb17f2a8e08"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_23ed1bb586432f62c75fabd494"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_f8beb5a7ddfab011c1a7b051bb"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_52328c7538a5a4e2d6a7373290"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_fb40b8e4a4792a3617ad7bcdcc"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_b25bc1c793c53b740ccc2792aa"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_8a56f478ba111a75b47e29a8ca"
        `);
        await queryRunner.query(`
            DROP TABLE "st"."ex_order"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_7cbf0ab9a10775294e0f42a72c"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_ac996738a2c240bd590df9603c"
        `);
        await queryRunner.query(`
            DROP TABLE "st"."ex_data_loader_task"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_75994a9e9ba7db0ff0f26194be"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_17304a78f571208b88fc0d5a18"
        `);
        await queryRunner.query(`
            DROP TABLE "st"."unified_symbol"
        `);
    }

}
