import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStrategyTemplateMemo1735173720086 implements MigrationInterface {
    name = 'AddStrategyTemplateMemo1735173720086'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_template"
            ADD "memo" character varying
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_template" DROP COLUMN "memo"
        `);
    }

}
