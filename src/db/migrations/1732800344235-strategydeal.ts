import { MigrationInterface, QueryRunner } from "typeorm";

export class Strategydeal1732800344235 implements MigrationInterface {
    name = 'Strategydeal1732800344235'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "st"."IDX_151234faef2b5b7d45196dce77"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_2690738be047431276195dbe0a"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_6af8a44aa4bbe36747d22d1e06"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_fa20a6e7779dd9edba4d907b66"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal" DROP COLUMN "params"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_deal" DROP COLUMN "params"
        `);
        await queryRunner.query(`
            CREATE SEQUENCE IF NOT EXISTS "st"."backtest_strategy_id_seq" OWNED BY "st"."backtest_strategy"."id"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_strategy"
            ALTER COLUMN "id"
            SET DEFAULT nextval('"st"."backtest_strategy_id_seq"')
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_strategy"
            ALTER COLUMN "id" DROP DEFAULT
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
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
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
            ALTER TABLE "st"."backtest_strategy"
            ALTER COLUMN "id"
            SET DEFAULT nextval('st.back_test_strategy_id_seq')
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_strategy"
            ALTER COLUMN "id" DROP DEFAULT
        `);
        await queryRunner.query(`
            DROP SEQUENCE "st"."backtest_strategy_id_seq"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_deal"
            ADD "params" jsonb
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal"
            ADD "params" jsonb
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_fa20a6e7779dd9edba4d907b66" ON "st"."backtest_strategy" ("user_ex_account_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_6af8a44aa4bbe36747d22d1e06" ON "st"."backtest_strategy" ("raw_symbol")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2690738be047431276195dbe0a" ON "st"."backtest_strategy" ("symbol")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_151234faef2b5b7d45196dce77" ON "st"."backtest_strategy" ("created_at")
        `);
    }

}
