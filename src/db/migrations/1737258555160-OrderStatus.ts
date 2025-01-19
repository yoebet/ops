import { MigrationInterface, QueryRunner } from "typeorm";

export class OrderStatus1737258555160 implements MigrationInterface {
    name = 'OrderStatus1737258555160'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order" DROP COLUMN "tpsl_client_order_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_order" DROP COLUMN "tpsl_client_order_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
            ADD "algo_status" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
            ADD "client_algo_order_id" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
            ADD "ex_algo_order_id" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
            ADD "ex_algo_created_at" TIMESTAMP
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
            ADD "ex_algo_updated_at" TIMESTAMP
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
            ADD "raw_algo_order" jsonb
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_order"
            ADD "algo_status" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_order"
            ADD "client_algo_order_id" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_order"
            ADD "ex_algo_order_id" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_order"
            ADD "ex_algo_created_at" TIMESTAMP
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_order"
            ADD "ex_algo_updated_at" TIMESTAMP
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_order"
            ADD "raw_algo_order" jsonb
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_7ca4498218c93ec6e9d4ebf0d9" ON "st"."ex_order" ("client_algo_order_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_593957612519389cb10d379ded" ON "st"."ex_order" ("ex_algo_order_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_a12e4f777b66081698b3d2caf6" ON "st"."backtest_order" ("client_algo_order_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_58ffb3a958b9b227d7a620061e" ON "st"."backtest_order" ("ex_algo_order_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "st"."IDX_58ffb3a958b9b227d7a620061e"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_a12e4f777b66081698b3d2caf6"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_593957612519389cb10d379ded"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_7ca4498218c93ec6e9d4ebf0d9"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_order" DROP COLUMN "raw_algo_order"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_order" DROP COLUMN "ex_algo_updated_at"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_order" DROP COLUMN "ex_algo_created_at"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_order" DROP COLUMN "ex_algo_order_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_order" DROP COLUMN "client_algo_order_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_order" DROP COLUMN "algo_status"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order" DROP COLUMN "raw_algo_order"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order" DROP COLUMN "ex_algo_updated_at"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order" DROP COLUMN "ex_algo_created_at"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order" DROP COLUMN "ex_algo_order_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order" DROP COLUMN "client_algo_order_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order" DROP COLUMN "algo_status"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_order"
            ADD "tpsl_client_order_id" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
            ADD "tpsl_client_order_id" character varying
        `);
    }

}
