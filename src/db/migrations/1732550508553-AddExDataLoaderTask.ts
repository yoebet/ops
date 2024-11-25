import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExDataLoaderTask1732550508553 implements MigrationInterface {
    name = 'AddExDataLoaderTask1732550508553'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "st"."ex_data_loader_task" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "ex" character varying NOT NULL,
                "market" character varying NOT NULL,
                "symbol" character varying NOT NULL,
                "raw_symbol" character varying NOT NULL,
                "interval" character varying NOT NULL,
                "task_type" character varying NOT NULL,
                "data_type" character varying NOT NULL,
                "params" jsonb,
                "start_date" character varying,
                "end_date" character varying,
                "last_date" character varying,
                "status" character varying NOT NULL DEFAULT 'pending',
                "completed_at" TIMESTAMP,
                CONSTRAINT "PK_e0a7efb334a54bd9460bf784439" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_ac996738a2c240bd590df9603c" ON "st"."ex_data_loader_task" ("created_at")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_7cbf0ab9a10775294e0f42a72c" ON "st"."ex_data_loader_task" (
                "ex",
                "symbol",
                "interval",
                "start_date",
                "end_date"
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy" DROP COLUMN "next_trade_side"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_data_loader_task"
            ADD CONSTRAINT "FK_c31ecf0705bc33f3b7a06f2315f" FOREIGN KEY ("symbol") REFERENCES "st"."unified_symbol"("symbol") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."ex_data_loader_task" DROP CONSTRAINT "FK_c31ecf0705bc33f3b7a06f2315f"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy"
            ADD "next_trade_side" character varying
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_7cbf0ab9a10775294e0f42a72c"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_ac996738a2c240bd590df9603c"
        `);
        await queryRunner.query(`
            DROP TABLE "st"."ex_data_loader_task"
        `);
    }

}
