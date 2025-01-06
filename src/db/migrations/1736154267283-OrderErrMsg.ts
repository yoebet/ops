import { MigrationInterface, QueryRunner } from "typeorm";

export class OrderErrMsg1736154267283 implements MigrationInterface {
    name = 'OrderErrMsg1736154267283'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
            ADD "err_msg" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_order"
            ADD "err_msg" character varying
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_order" DROP COLUMN "err_msg"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order" DROP COLUMN "err_msg"
        `);
    }

}
