import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterStrategy121732705313920 implements MigrationInterface {
    name = 'AlterStrategy121732705313920'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "open_checker_algo"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "close_checker_algo"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_template"
            ADD "open_algo" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_template"
            ADD "close_algo" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_template"
            ADD "open_deal_side" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "open_algo" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "close_algo" character varying
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "close_algo"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "open_algo"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_template" DROP COLUMN "open_deal_side"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_template" DROP COLUMN "close_algo"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_template" DROP COLUMN "open_algo"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "close_checker_algo" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "open_checker_algo" character varying
        `);
    }

}
