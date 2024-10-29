import { MigrationInterface, QueryRunner } from "typeorm";

export class M11730891648137 implements MigrationInterface {
    name = 'M11730891648137'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "md"."ex_symbol_data_task" DROP CONSTRAINT "FK_04a33c63b7db13eccce18350e5b"
        `);
        await queryRunner.query(`
            DROP INDEX "md"."IDX_a4735413d100ec8bc5066d5db7"
        `);
        await queryRunner.query(`
            DROP INDEX "md"."IDX_161e4ac3beaa457346981a19fa"
        `);
        await queryRunner.query(`
            ALTER TABLE "md"."exchange_symbol" DROP COLUMN "data_from"
        `);
        await queryRunner.query(`
            ALTER TABLE "md"."exchange_symbol" DROP COLUMN "interval_from"
        `);
        await queryRunner.query(`
            ALTER TABLE "md"."exchange_symbol"
            ADD "data_date_from" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "md"."exchange_symbol"
            ADD "data_interval_from" character varying NOT NULL
        `);
        await queryRunner.query(`
            CREATE SEQUENCE IF NOT EXISTS "md"."unified_symbol_id_seq" OWNED BY "md"."unified_symbol"."id"
        `);
        await queryRunner.query(`
            ALTER TABLE "md"."unified_symbol"
            ALTER COLUMN "id"
            SET DEFAULT nextval('"md"."unified_symbol_id_seq"')
        `);
        await queryRunner.query(`
            ALTER TABLE "md"."unified_symbol"
            ALTER COLUMN "id" DROP DEFAULT
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_17304a78f571208b88fc0d5a18" ON "md"."unified_symbol" ("created_at")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_75994a9e9ba7db0ff0f26194be" ON "md"."unified_symbol" ("symbol")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "md"."IDX_75994a9e9ba7db0ff0f26194be"
        `);
        await queryRunner.query(`
            DROP INDEX "md"."IDX_17304a78f571208b88fc0d5a18"
        `);
        await queryRunner.query(`
            ALTER TABLE "md"."unified_symbol"
            ALTER COLUMN "id"
            SET DEFAULT nextval('md.symbol_config_id_seq')
        `);
        await queryRunner.query(`
            ALTER TABLE "md"."unified_symbol"
            ALTER COLUMN "id" DROP DEFAULT
        `);
        await queryRunner.query(`
            DROP SEQUENCE "md"."unified_symbol_id_seq"
        `);
        await queryRunner.query(`
            ALTER TABLE "md"."exchange_symbol" DROP COLUMN "data_interval_from"
        `);
        await queryRunner.query(`
            ALTER TABLE "md"."exchange_symbol" DROP COLUMN "data_date_from"
        `);
        await queryRunner.query(`
            ALTER TABLE "md"."exchange_symbol"
            ADD "interval_from" character varying NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "md"."exchange_symbol"
            ADD "data_from" TIMESTAMP
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_161e4ac3beaa457346981a19fa" ON "md"."unified_symbol" ("symbol")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_a4735413d100ec8bc5066d5db7" ON "md"."unified_symbol" ("created_at")
        `);
        await queryRunner.query(`
            ALTER TABLE "md"."ex_symbol_data_task"
            ADD CONSTRAINT "FK_04a33c63b7db13eccce18350e5b" FOREIGN KEY ("ex", "symbol") REFERENCES "md"."exchange_symbol"("ex", "symbol") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

}
