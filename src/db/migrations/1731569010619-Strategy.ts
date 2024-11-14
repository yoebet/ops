import { MigrationInterface, QueryRunner } from "typeorm";

export class Strategy1731569010619 implements MigrationInterface {
    name = 'Strategy1731569010619'

    public async up(queryRunner: QueryRunner): Promise<void> {
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
                "template_id" integer NOT NULL,
                "name" character varying NOT NULL,
                "code" character varying NOT NULL,
                "user_ex_account_id" integer NOT NULL,
                "trade_type" character varying NOT NULL,
                "active" boolean NOT NULL,
                "accumulated_pnl_usd" numeric,
                "params" jsonb,
                "exec_info" jsonb,
                CONSTRAINT "UQ_25fc6f9146b09c3f92d846e9556" UNIQUE (
                    "template_id",
                    "user_ex_account_id",
                    "trade_type",
                    "symbol"
                ),
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
            CREATE INDEX "IDX_f770cf55db32113b3214819e6c" ON "st"."strategy" ("template_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_0780abda00222c02726d9af8a9" ON "st"."strategy" ("code")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_6e53431e775fd6232248d7f7e0" ON "st"."strategy" ("user_ex_account_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "st"."strategy_template" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "name" character varying NOT NULL,
                "code" character varying NOT NULL,
                "trade_type" character varying,
                "params" jsonb,
                CONSTRAINT "PK_f770cf55db32113b3214819e6c2" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_c5c7297f68e2c015d1601ac7bc" ON "st"."strategy_template" ("created_at")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_dc459cbf2b7cb23b1fb155610c" ON "st"."strategy_template" ("name")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_36730ed80e30201361a6ae2be3" ON "st"."strategy_template" ("code")
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
                "pnl_usd" numeric,
                "status" character varying NOT NULL,
                "params" jsonb,
                "exec_info" jsonb,
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
            ALTER TABLE "st"."ex_order" DROP COLUMN "margin"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order" DROP COLUMN "margin_mode"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
            ADD "strategy_id" integer
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
            ADD "deal_id" integer
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
            ADD "trade_type" character varying
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
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
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
            ALTER TABLE "st"."ex_order" DROP COLUMN "trade_type"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order" DROP COLUMN "deal_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order" DROP COLUMN "strategy_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
            ADD "margin_mode" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
            ADD "margin" boolean NOT NULL
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
            DROP INDEX "st"."IDX_36730ed80e30201361a6ae2be3"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_dc459cbf2b7cb23b1fb155610c"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_c5c7297f68e2c015d1601ac7bc"
        `);
        await queryRunner.query(`
            DROP TABLE "st"."strategy_template"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_6e53431e775fd6232248d7f7e0"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_0780abda00222c02726d9af8a9"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_f770cf55db32113b3214819e6c"
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
    }

}
