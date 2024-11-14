import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveExAccount1731549016285 implements MigrationInterface {
    name = 'RemoveExAccount1731549016285'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "st"."IDX_186f7dc24b2bf3fbebb762f094"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
                RENAME COLUMN "ex_account" TO "market"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."exchange_symbol" DROP COLUMN "ex_account"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."exchange_symbol"
            ADD "ex_account" character varying NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
                RENAME COLUMN "market" TO "ex_account"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_186f7dc24b2bf3fbebb762f094" ON "st"."exchange_symbol" ("ex_account", "symbol")
        `);
    }

}
