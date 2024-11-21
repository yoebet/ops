import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterStrategy71732195838952 implements MigrationInterface {
    name = 'AlterStrategy71732195838952'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP CONSTRAINT "UQ_e435362b04f621de9abc2a453fe"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
                RENAME COLUMN "template_code" TO "algo_code"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD CONSTRAINT "UQ_378cb01f2ce8abd60bb325f1555" UNIQUE (
                    "algo_code",
                    "user_ex_account_id",
                    "trade_type",
                    "symbol"
                )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP CONSTRAINT "UQ_378cb01f2ce8abd60bb325f1555"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
                RENAME COLUMN "algo_code" TO "template_code"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD CONSTRAINT "UQ_e435362b04f621de9abc2a453fe" UNIQUE (
                    "symbol",
                    "user_ex_account_id",
                    "trade_type",
                    "template_code"
                )
        `);
    }

}
