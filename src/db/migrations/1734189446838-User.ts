import { MigrationInterface, QueryRunner } from "typeorm";

export class User1734189446838 implements MigrationInterface {
    name = 'User1734189446838'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "st"."IDX_065d4d8f3b5adb4a08841eae3c"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."user" DROP COLUMN "name"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."user"
            ADD "username" character varying NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."user"
            ADD CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username")
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."user"
            ADD "password" character varying NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."user"
            ADD "role" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."user"
            ADD "email" character varying
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."user" DROP COLUMN "email"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."user" DROP COLUMN "role"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."user" DROP COLUMN "password"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."user" DROP CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."user" DROP COLUMN "username"
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."user"
            ADD "name" character varying NOT NULL
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_065d4d8f3b5adb4a08841eae3c" ON "st"."user" ("name")
        `);
    }

}
