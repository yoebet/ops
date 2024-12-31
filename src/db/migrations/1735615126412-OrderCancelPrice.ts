import { MigrationInterface, QueryRunner } from "typeorm";

export class OrderCancelPrice1735615126412 implements MigrationInterface {
    name = 'OrderCancelPrice1735615126412'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
            ADD "cancel_price" numeric
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_order"
            ADD "cancel_price" numeric
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_order" DROP COLUMN "cancel_price"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order" DROP COLUMN "cancel_price"
        `);
    }

}
