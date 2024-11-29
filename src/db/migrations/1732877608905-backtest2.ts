import { MigrationInterface, QueryRunner } from "typeorm";

export class Backtest21732877608905 implements MigrationInterface {
    name = 'Backtest21732877608905'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_order" DROP COLUMN "task_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_deal" DROP COLUMN "task_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_strategy"
            ADD "data_from" character varying NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_strategy"
            ADD "data_to" character varying NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_strategy"
            ADD "started_at" TIMESTAMP
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_strategy"
            ADD "completed_at" TIMESTAMP
        `);
        await queryRunner.query(`
            CREATE SEQUENCE IF NOT EXISTS "st"."backtest_strategy_id_seq" OWNED BY "st"."backtest_strategy"."id"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_strategy"
            ALTER COLUMN "id"
            SET DEFAULT nextval('"st"."backtest_strategy_id_seq"')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_strategy"
            ALTER COLUMN "id" DROP DEFAULT
        `);
        await queryRunner.query(`
            DROP SEQUENCE "st"."backtest_strategy_id_seq"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_strategy" DROP COLUMN "completed_at"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_strategy" DROP COLUMN "started_at"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_strategy" DROP COLUMN "data_to"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_strategy" DROP COLUMN "data_from"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_deal"
            ADD "task_id" integer NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_order"
            ADD "task_id" integer NOT NULL
        `);
    }

}
