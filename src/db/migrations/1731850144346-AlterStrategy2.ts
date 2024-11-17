import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterStrategy21731850144346 implements MigrationInterface {
    name = 'AlterStrategy21731850144346'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "about_to" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "job_summited" boolean
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal"
            ADD "pending_order" jsonb
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal" DROP COLUMN "pending_order"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "job_summited"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "about_to"
        `);
    }

}
