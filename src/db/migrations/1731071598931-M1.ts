import { MigrationInterface, QueryRunner } from 'typeorm';

export class M11731071598931 implements MigrationInterface {
  name = 'M11731071598931';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE "st"."unified_symbol"
        (
            "id"         SERIAL            NOT NULL,
            "created_at" TIMESTAMP         NOT NULL DEFAULT now(),
            "deleted_at" TIMESTAMP,
            "symbol"     character varying NOT NULL,
            "market"     character varying NOT NULL,
            "base"       character varying NOT NULL,
            "quote"      character varying NOT NULL,
            "settle"     character varying,
            CONSTRAINT "PK_25725b3bd096048ee754222acd4" PRIMARY KEY ("id")
        )
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_17304a78f571208b88fc0d5a18" ON "st"."unified_symbol" ("created_at")
    `);
    await queryRunner.query(`
        CREATE UNIQUE INDEX "IDX_75994a9e9ba7db0ff0f26194be" ON "st"."unified_symbol" ("symbol")
    `);
    await queryRunner.query(`
        CREATE TABLE "st"."instance_log"
        (
            "id"            SERIAL            NOT NULL,
            "created_at"    TIMESTAMP         NOT NULL DEFAULT now(),
            "deleted_at"    TIMESTAMP,
            "node_id"       character varying NOT NULL,
            "profile_name"  character varying,
            "profile"       jsonb,
            "git_branch"    character varying,
            "git_sha"       character varying,
            "git_commit_at" character varying,
            "started_at"    TIMESTAMP         NOT NULL,
            "stopped_at"    TIMESTAMP,
            "stop_style"    character varying,
            CONSTRAINT "PK_49b0f0e2240a2e5583ce70a778d" PRIMARY KEY ("id")
        )
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_2b006e37cec90b243d3d4ff212" ON "st"."instance_log" ("created_at")
    `);
    await queryRunner.query(`
        CREATE TABLE "st"."exchange_symbol"
        (
            "id"            SERIAL            NOT NULL,
            "created_at"    TIMESTAMP         NOT NULL DEFAULT now(),
            "deleted_at"    TIMESTAMP,
            "ex"            character varying NOT NULL,
            "ex_account"    character varying NOT NULL,
            "market"        character varying NOT NULL DEFAULT 'spot',
            "symbol"        character varying NOT NULL,
            "raw_symbol"    character varying NOT NULL,
            "price_tick"    character varying,
            "volume_step"   character varying,
            "exchange_info" jsonb,
            CONSTRAINT "PK_31e154ea075fa008a875a510d18" PRIMARY KEY ("id")
        );
        COMMENT ON COLUMN "st"."exchange_symbol"."raw_symbol" IS '交易所 symbol'
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_ce418fe8e8cd8952b8995bfb1b" ON "st"."exchange_symbol" ("created_at")
    `);
    await queryRunner.query(`
        CREATE UNIQUE INDEX "IDX_68e33073b90b2ab84a7e04940b" ON "st"."exchange_symbol" ("ex", "market", "raw_symbol")
    `);
    await queryRunner.query(`
        CREATE UNIQUE INDEX "IDX_186f7dc24b2bf3fbebb762f094" ON "st"."exchange_symbol" ("ex_account", "symbol")
    `);
    await queryRunner.query(`
        CREATE UNIQUE INDEX "IDX_f51eefe300102dbbb0d3150983" ON "st"."exchange_symbol" ("ex", "symbol")
    `);
    await queryRunner.query(`
        CREATE TABLE "st"."sys_config"
        (
            "id"         SERIAL            NOT NULL,
            "created_at" TIMESTAMP         NOT NULL DEFAULT now(),
            "deleted_at" TIMESTAMP,
            "scope"      character varying NOT NULL,
            "key"        character varying NOT NULL,
            "value"      character varying NOT NULL,
            "value_type" character varying NOT NULL,
            CONSTRAINT "PK_8791cee36df4c4d04a9acffed27" PRIMARY KEY ("id")
        )
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_763ff2d867cd3fc26c71b04fe7" ON "st"."sys_config" ("created_at")
    `);
    await queryRunner.query(`
        CREATE UNIQUE INDEX "IDX_598e37fd646ca26ba7097d3b69" ON "st"."sys_config" ("scope", "key")
    `);
    await queryRunner.query(`
        CREATE TABLE "st"."coin"
        (
            "id"            SERIAL            NOT NULL,
            "created_at"    TIMESTAMP         NOT NULL DEFAULT now(),
            "deleted_at"    TIMESTAMP,
            "coin"          character varying NOT NULL,
            "name"          character varying,
            "stable"        boolean           NOT NULL DEFAULT false,
            "display_order" integer           NOT NULL DEFAULT '0',
            CONSTRAINT "PK_650993fc71b789e4793b62fbcac" PRIMARY KEY ("id")
        )
    `);
    await queryRunner.query(`
        CREATE INDEX "IDX_bca088c4a56359e3b7c0fd3e8c" ON "st"."coin" ("created_at")
    `);
    await queryRunner.query(`
        CREATE UNIQUE INDEX "IDX_4b9e82139806743fe4ddb64c30" ON "st"."coin" ("coin")
    `);
    await queryRunner.query(`
        ALTER TABLE "st"."exchange_symbol"
            ADD CONSTRAINT "FK_90eb17ec70e29e1e2bb3782893a" FOREIGN KEY ("symbol") REFERENCES "st"."unified_symbol" ("symbol") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "st"."exchange_symbol"
            DROP CONSTRAINT "FK_90eb17ec70e29e1e2bb3782893a"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_4b9e82139806743fe4ddb64c30"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_bca088c4a56359e3b7c0fd3e8c"
    `);
    await queryRunner.query(`
        DROP TABLE "st"."coin"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_598e37fd646ca26ba7097d3b69"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_763ff2d867cd3fc26c71b04fe7"
    `);
    await queryRunner.query(`
        DROP TABLE "st"."sys_config"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_f51eefe300102dbbb0d3150983"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_186f7dc24b2bf3fbebb762f094"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_68e33073b90b2ab84a7e04940b"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_ce418fe8e8cd8952b8995bfb1b"
    `);
    await queryRunner.query(`
        DROP TABLE "st"."exchange_symbol"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_2b006e37cec90b243d3d4ff212"
    `);
    await queryRunner.query(`
        DROP TABLE "st"."instance_log"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_75994a9e9ba7db0ff0f26194be"
    `);
    await queryRunner.query(`
        DROP INDEX "st"."IDX_17304a78f571208b88fc0d5a18"
    `);
    await queryRunner.query(`
        DROP TABLE "st"."unified_symbol"
    `);
  }

}
