import { MigrationInterface, QueryRunner } from "typeorm";

export class AssetSnapshotRmUpdatedAt1731740104049 implements MigrationInterface {
    name = 'AssetSnapshotRmUpdatedAt1731740104049'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."ex_asset_snapshot_coin" DROP COLUMN "updated_at"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "st"."ex_asset_snapshot_coin"
            ADD "updated_at" TIMESTAMP NOT NULL
        `);
    }

}
