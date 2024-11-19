import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterStrategy51732032091928 implements MigrationInterface {
  name = 'AlterStrategy51732032091928';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP INDEX "st"."IDX_36730ed80e30201361a6ae2bff"
    `);
    await queryRunner.query(`
        ALTER TABLE "st"."strategy"
            DROP COLUMN "quota_amount"
    `);
    await queryRunner.query(`
        ALTER TABLE "st"."strategy"
            ADD "base_size" numeric
    `);
    await queryRunner.query(`
        ALTER TABLE "st"."strategy"
            ADD "quote_amount" numeric
    `);
    await queryRunner.query(`
        ALTER TABLE "st"."strategy_template"
            ADD "quote_amount" numeric
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "st"."strategy_template"
            DROP COLUMN "quote_amount"
    `);
    await queryRunner.query(`
        ALTER TABLE "st"."strategy"
            DROP COLUMN "quote_amount"
    `);
    await queryRunner.query(`
        ALTER TABLE "st"."strategy"
            DROP COLUMN "base_size"
    `);
    await queryRunner.query(`
        ALTER TABLE "st"."strategy"
            ADD "quota_amount" numeric
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_36730ed80e30201361a6ae2bff" ON "st"."strategy" ("template_code")
    `);
  }

}
