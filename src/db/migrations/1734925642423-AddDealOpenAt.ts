import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDealOpenAt1734925642423 implements MigrationInterface {
    name = 'AddDealOpenAt1734925642423'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal"
            ADD "open_at" TIMESTAMP
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal"
            ADD "deal_duration" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_deal"
            ADD "open_at" TIMESTAMP
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_deal"
            ADD "deal_duration" character varying
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_deal" DROP COLUMN "deal_duration"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."backtest_deal" DROP COLUMN "open_at"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal" DROP COLUMN "deal_duration"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."strategy_deal" DROP COLUMN "open_at"
        `);
    }

}
