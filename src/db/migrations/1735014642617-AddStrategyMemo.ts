import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStrategyMemo1735014642617 implements MigrationInterface {
    name = 'AddStrategyMemo1735014642617'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "memo" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_strategy"
            ADD "memo" character varying
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_strategy" DROP COLUMN "memo"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "memo"
        `);
    }

}
