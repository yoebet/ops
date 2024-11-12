import { MigrationInterface, QueryRunner } from "typeorm";

export class UserExAccount1731398341183 implements MigrationInterface {
    name = 'UserExAccount1731398341183'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "st"."user" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "name" character varying NOT NULL,
                CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_d091f1d36f18bbece2a9eabc6e" ON "st"."user" ("created_at")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_065d4d8f3b5adb4a08841eae3c" ON "st"."user" ("name")
        `);
        await queryRunner.query(`
            CREATE TABLE "st"."user_ex_account" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "user_id" integer NOT NULL,
                "ex" character varying NOT NULL,
                "name" character varying NOT NULL,
                "apikey_key" character varying NOT NULL,
                "apikey_secret" character varying NOT NULL,
                "apikey_password" character varying,
                CONSTRAINT "PK_b470e8e840702d51a56c2c4c1e0" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_70d4d5d49992161edc3d589e21" ON "st"."user_ex_account" ("created_at")
        `);
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order"
            ADD "user_ex_account_id" integer NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."ex_order" DROP COLUMN "user_ex_account_id"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_70d4d5d49992161edc3d589e21"
        `);
        await queryRunner.query(`
            DROP TABLE "st"."user_ex_account"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_065d4d8f3b5adb4a08841eae3c"
        `);
        await queryRunner.query(`
            DROP INDEX "st"."IDX_d091f1d36f18bbece2a9eabc6e"
        `);
        await queryRunner.query(`
            DROP TABLE "st"."user"
        `);
    }

}
