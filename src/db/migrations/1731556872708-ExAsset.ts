import { MigrationInterface, QueryRunner } from "typeorm";

export class ExAsset1731556872708 implements MigrationInterface {
    name = 'ExAsset1731556872708'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "st"."ex_asset" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "user_ex_account_id" integer NOT NULL,
                "ex" character varying NOT NULL,
                "trade_type" character varying NOT NULL,
                "updated_at" TIMESTAMP NOT NULL,
                "total_eq_usd" numeric,
                CONSTRAINT "UQ_906dad653832973a3d2dda5c02e" UNIQUE ("user_ex_account_id", "trade_type"),
                CONSTRAINT "PK_8695e890a3581b7918f1000ee1e" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_ea81f2c9b236f588150759192c" ON "st"."ex_asset" ("created_at")
        `);
        await queryRunner.query(`
            CREATE TABLE "st"."ex_asset_coin" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "ex_asset_id" integer NOT NULL,
                "user_ex_account_id" integer NOT NULL,
                "ex" character varying NOT NULL,
                "trade_type" character varying NOT NULL,
                "updated_at" TIMESTAMP NOT NULL,
                "coin" character varying NOT NULL,
                "eq" numeric,
                "avail_bal" numeric NOT NULL,
                "frozen_bal" numeric NOT NULL,
                "eq_usd" numeric,
                "ord_frozen" numeric,
                CONSTRAINT "UQ_daed587113bc5e7b1b965dae961" UNIQUE ("user_ex_account_id", "trade_type", "coin"),
                CONSTRAINT "UQ_41249e9b6557e165c5a4035b23f" UNIQUE ("ex_asset_id", "coin"),
                CONSTRAINT "PK_e108026e475a7e1994f60f72d80" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2eb3834f001873391976e83e75" ON "st"."ex_asset_coin" ("created_at")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "st"."IDX_2eb3834f001873391976e83e75"
        `);
        await queryRunner.query(`
            DROP TABLE "st"."ex_asset_coin"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_ea81f2c9b236f588150759192c"
        `);
        await queryRunner.query(`
            DROP TABLE "st"."ex_asset"
        `);
    }

}
