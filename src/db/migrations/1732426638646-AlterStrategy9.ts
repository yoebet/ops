import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterStrategy91732426638646 implements MigrationInterface {
    name = 'AlterStrategy91732426638646'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
            ADD "tag" character varying
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order" DROP COLUMN "tag"
        `);
    }

}
