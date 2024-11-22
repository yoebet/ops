import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterStrategy81732257139821 implements MigrationInterface {
    name = 'AlterStrategy81732257139821'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP CONSTRAINT "UQ_378cb01f2ce8abd60bb325f1555"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "runtime_params"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "runtime_params" jsonb
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD CONSTRAINT "UQ_378cb01f2ce8abd60bb325f1555" UNIQUE (
                    "symbol",
                    "user_ex_account_id",
                    "trade_type",
                    "algo_code"
                )
        `);
    }

}
