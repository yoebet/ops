import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterOrder11732724457014 implements MigrationInterface {
    name = 'AlterOrder11732724457014'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
                RENAME COLUMN "move_drawback_ratio" TO "move_drawback_percent"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
                RENAME COLUMN "move_drawback_percent" TO "move_drawback_ratio"
        `);
    }

}
