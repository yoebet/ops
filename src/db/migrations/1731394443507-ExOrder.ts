import { MigrationInterface, QueryRunner } from "typeorm";

export class ExOrder1731394443507 implements MigrationInterface {
    name = 'ExOrder1731394443507'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "st"."ex_order" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "ex" character varying NOT NULL,
                "ex_account" character varying NOT NULL,
                "base_coin" character varying NOT NULL,
                "symbol" character varying NOT NULL,
                "raw_symbol" character varying NOT NULL,
                "side" character varying NOT NULL,
                "margin" boolean NOT NULL,
                "margin_mode" character varying,
                "time_type" character varying,
                "status" character varying NOT NULL,
                "client_order_id" character varying,
                "price_type" character varying NOT NULL,
                "price" numeric,
                "base_size" numeric,
                "quote_amount" numeric,
                "reduce_only" boolean,
                "algo_order" boolean NOT NULL,
                "algo_type" character varying,
                "tp_trigger_price" numeric,
                "tp_order_price" numeric,
                "sl_trigger_price" numeric,
                "sl_order_price" numeric,
                "move_drawback_ratio" numeric,
                "move_active_price" numeric,
                "ex_order_id" character varying,
                "exec_price" numeric,
                "exec_size" numeric,
                "exec_amount" numeric,
                "ex_created_at" TIMESTAMP,
                "ex_updated_at" TIMESTAMP,
                "raw_order_params" jsonb,
                "raw_order" jsonb,
                CONSTRAINT "UQ_a59342e9f9af303b7439adce2de" UNIQUE ("ex", "client_order_id"),
                CONSTRAINT "UQ_ab3529eeeb629b12d67eb187ddc" UNIQUE ("ex", "ex_order_id"),
                CONSTRAINT "PK_ad5b16350c6c56e88cd5bf99afc" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_8a56f478ba111a75b47e29a8ca" ON "st"."ex_order" ("created_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_b25bc1c793c53b740ccc2792aa" ON "st"."ex_order" ("symbol")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_fb40b8e4a4792a3617ad7bcdcc" ON "st"."ex_order" ("raw_symbol")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_ffc7209b86c1b3beb17f2a8e08" ON "st"."ex_order" ("client_order_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_4c137df06e37f2031c4f10fb47" ON "st"."ex_order" ("ex_order_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "st"."IDX_4c137df06e37f2031c4f10fb47"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_ffc7209b86c1b3beb17f2a8e08"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_fb40b8e4a4792a3617ad7bcdcc"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_b25bc1c793c53b740ccc2792aa"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_8a56f478ba111a75b47e29a8ca"
        `);
        await queryRunner.query(`
            DROP TABLE "st"."ex_order"
        `);
    }

}
