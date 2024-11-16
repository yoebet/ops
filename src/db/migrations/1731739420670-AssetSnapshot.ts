import { MigrationInterface, QueryRunner } from "typeorm";

export class AssetSnapshot1731739420670 implements MigrationInterface {
    name = 'AssetSnapshot1731739420670'

    public async up(queryRunner: QueryRunner): Promise<void> {
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
                "updated_at" TIMESTAMP NOT NULL,
                "coin" character varying NOT NULL,
                "eq" numeric,
                "avail_bal" numeric NOT NULL,
                "frozen_bal" numeric NOT NULL,
                "eq_usd" numeric,
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
            ALTER TABLE "st"."user_ex_account"
            ADD "apikey_label" character varying
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."user_ex_account" DROP COLUMN "apikey_label"
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
    }

}
