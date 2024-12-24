import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDealCloseReason1734943163560 implements MigrationInterface {
    name = 'AddDealCloseReason1734943163560'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal"
            ADD "close_reason" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal"
            ADD "orders_count" integer
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_deal"
            ADD "close_reason" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_deal"
            ADD "orders_count" integer
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_deal" DROP COLUMN "orders_count"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_deal" DROP COLUMN "close_reason"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal" DROP COLUMN "orders_count"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal" DROP COLUMN "close_reason"
        `);
    }

}
