import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterStrategy111732698276496 implements MigrationInterface {
    name = 'AlterStrategy111732698276496'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal"
            ADD "closed_at" TIMESTAMP
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "open_checker_algo" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "close_checker_algo" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "open_deal_side" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "last_deal_id" integer
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "last_deal_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "open_deal_side"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "close_checker_algo"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "open_checker_algo"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal" DROP COLUMN "closed_at"
        `);
    }

}
