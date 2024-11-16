import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterStrategy1731762228613 implements MigrationInterface {
    name = 'AlterStrategy1731762228613'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "st"."IDX_0780abda00222c02726d9af8a9"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
                RENAME COLUMN "price" TO "limit_price"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "code"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "current_deal_id" integer
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "last_deal_id" integer
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal"
            ADD "last_order" jsonb
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal" DROP COLUMN "last_order"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "last_deal_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "current_deal_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "code" character varying NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
                RENAME COLUMN "limit_price" TO "price"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_0780abda00222c02726d9af8a9" ON "st"."strategy" ("code")
        `);
    }

}
