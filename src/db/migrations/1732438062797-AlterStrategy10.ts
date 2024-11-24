import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterStrategy101732438062797 implements MigrationInterface {
    name = 'AlterStrategy101732438062797'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "st"."IDX_dc459cbf2b7cb23b1fb155610c"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_36730ed80e30201361a6ae2be3"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_36730ed80e30201361a6ae2be3" ON "st"."strategy_template" ("code")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "st"."IDX_36730ed80e30201361a6ae2be3"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_36730ed80e30201361a6ae2be3" ON "st"."strategy_template" ("code")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_dc459cbf2b7cb23b1fb155610c" ON "st"."strategy_template" ("name")
        `);
    }

}
