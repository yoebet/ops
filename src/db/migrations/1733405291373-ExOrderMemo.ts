import { MigrationInterface, QueryRunner } from "typeorm";

export class ExOrderMemo1733405291373 implements MigrationInterface {
    name = 'ExOrderMemo1733405291373'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
            ADD "memo" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_order"
            ADD "memo" character varying
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_order" DROP COLUMN "memo"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order" DROP COLUMN "memo"
        `);
    }

}
