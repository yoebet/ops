import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterStrategy41732021428327 implements MigrationInterface {
  name = 'AlterStrategy41732021428327';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP INDEX "st"."IDX_f770cf55db32113b3214819e6c"
    `);
    await queryRunner.query(`
        ALTER TABLE "st"."strategy"
            DROP CONSTRAINT "UQ_25fc6f9146b09c3f92d846e9556"
    `);
    await queryRunner.query(`
        ALTER TABLE "st"."strategy"
            RENAME COLUMN "template_id" TO "template_code"
    `);
    await queryRunner.query(`
        ALTER TABLE "st"."strategy"
            DROP COLUMN "template_code"
    `);
    await queryRunner.query(`
        ALTER TABLE "st"."strategy"
            ADD "template_code" character varying NOT NULL
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_36730ed80e30201361a6ae2bff" ON "st"."strategy" ("template_code")
    `);
    await queryRunner.query(`
        ALTER TABLE "st"."strategy"
            ADD CONSTRAINT "UQ_e435362b04f621de9abc2a453fe" UNIQUE (
                                                                    "template_code",
                                                                    "user_ex_account_id",
                                                                    "trade_type",
                                                                    "symbol"
                )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "st"."strategy"
            DROP CONSTRAINT "UQ_e435362b04f621de9abc2a453fe"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_36730ed80e30201361a6ae2bff"
    `);
    await queryRunner.query(`
        ALTER TABLE "st"."strategy"
            DROP COLUMN "template_code"
    `);
    await queryRunner.query(`
        ALTER TABLE "st"."strategy"
            ADD "template_code" integer NOT NULL
    `);
    await queryRunner.query(`
        ALTER TABLE "st"."strategy"
            RENAME COLUMN "template_code" TO "template_id"
    `);
    await queryRunner.query(`
        ALTER TABLE "st"."strategy"
            ADD CONSTRAINT "UQ_25fc6f9146b09c3f92d846e9556" UNIQUE (
                                                                    "symbol",
                                                                    "template_id",
                                                                    "user_ex_account_id",
                                                                    "trade_type"
                )
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_f770cf55db32113b3214819e6c" ON "st"."strategy" ("template_id")
    `);
  }

}
