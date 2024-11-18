import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterStrategy31731946664839 implements MigrationInterface {
    name = 'AlterStrategy31731946664839'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "accumulated_pnl_usd"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "exec_info"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "last_deal_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "about_to"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal" DROP COLUMN "last_order"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal" DROP COLUMN "pending_order"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "next_trade_side" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "quota_amount" numeric
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "runtime_params" jsonb
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "paper_trade" boolean
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal"
            ADD "pending_order_id" integer
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal"
            ADD "last_order_id" integer
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal"
            ADD "paper_trade" boolean
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
            ADD "paper_trade" boolean
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_919db3233e2258993bc280326b" ON "st"."user_ex_account" ("apikey_key")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "st"."IDX_919db3233e2258993bc280326b"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order" DROP COLUMN "paper_trade"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal" DROP COLUMN "paper_trade"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal" DROP COLUMN "last_order_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal" DROP COLUMN "pending_order_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "paper_trade"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "runtime_params"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "quota_amount"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "next_trade_side"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal"
            ADD "pending_order" jsonb
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal"
            ADD "last_order" jsonb
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "about_to" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "last_deal_id" integer
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "exec_info" jsonb
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "accumulated_pnl_usd" numeric
        `);
    }

}
