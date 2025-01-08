import { MigrationInterface, QueryRunner } from "typeorm";

export class StrategyDealLastOrderSide1736324558835 implements MigrationInterface {
    name = 'StrategyDealLastOrderSide1736324558835'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal"
            ADD "last_order_side" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_deal"
            ADD "last_order_side" character varying
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_deal" DROP COLUMN "last_order_side"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal" DROP COLUMN "last_order_side"
        `);
    }

}
