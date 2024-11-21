import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterStrategy61732111679986 implements MigrationInterface {
    name = 'AlterStrategy61732111679986'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order" DROP COLUMN "algo_type"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
            ADD "tpsl_type" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
            ADD "tpsl_client_order_id" character varying
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order" DROP COLUMN "tpsl_client_order_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order" DROP COLUMN "tpsl_type"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
            ADD "algo_type" character varying
        `);
    }

}
