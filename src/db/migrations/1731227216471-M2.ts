import { MigrationInterface, QueryRunner } from "typeorm";

export class M21731227216471 implements MigrationInterface {
    name = 'M21731227216471'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."exchange_symbol" DROP COLUMN "price_tick"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."exchange_symbol" DROP COLUMN "volume_step"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."exchange_symbol"
            ADD "price_digits" smallint
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."exchange_symbol"
            ADD "base_size_digits" smallint
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_68e33073b90b2ab84a7e04940b"
        `);
        await queryRunner.query(`
            COMMENT ON COLUMN "st"."exchange_symbol"."raw_symbol" IS NULL
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_68e33073b90b2ab84a7e04940b" ON "st"."exchange_symbol" ("ex", "market", "raw_symbol")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "st"."IDX_68e33073b90b2ab84a7e04940b"
        `);
        await queryRunner.query(`
            COMMENT ON COLUMN "st"."exchange_symbol"."raw_symbol" IS '交易所 symbol'
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_68e33073b90b2ab84a7e04940b" ON "st"."exchange_symbol" ("ex", "market", "raw_symbol")
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."exchange_symbol" DROP COLUMN "base_size_digits"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."exchange_symbol" DROP COLUMN "price_digits"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."exchange_symbol"
            ADD "volume_step" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."exchange_symbol"
            ADD "price_tick" character varying
        `);
    }

}
