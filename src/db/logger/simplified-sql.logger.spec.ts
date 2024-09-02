import { PlatformTools } from 'typeorm/platform/PlatformTools';
import { simplifySql } from '@/db/logger/simplified-sql.logger';

test('logger - select sql', () => {
  const sql = `SELECT 
       "ApiKey"."id"                      AS "ApiKey_id",
       "ApiKey"."created_at"              AS "ApiKey_created_at",
       "ApiKey"."updated_at"              AS "ApiKey_updated_at",
       "ApiKey"."deleted_at"              AS "ApiKey_deleted_at",
       "ApiKey"."user_id"                 AS "ApiKey_user_id",
       "ApiKey"."algo_type"               AS "ApiKey_algo_type",
       "ApiKey"."exchange_id"             AS "ApiKey_exchange_id",
       "ApiKey"."exchange_user_id"        AS "ApiKey_exchange_user_id",
       "ApiKey"."key"                     AS "ApiKey_key",
       "ApiKey"."secret"                  AS "ApiKey_secret",
       "ApiKey"."password"                AS "ApiKey_password",
       "ApiKey"."subaccount"              AS "ApiKey_subaccount",
       "ApiKey"."remark"                  AS "ApiKey_remark"
FROM "t_api_key" "ApiKey"
WHERE (("ApiKey"."user_id" = $1 AND "ApiKey"."exchange_id" = $2))
  AND ("ApiKey"."deleted_at" IS NULL)`;

  PlatformTools.logInfo('original:\n', sql);

  const ss1 = simplifySql(sql);
  const hs1 = PlatformTools.highlightSql(ss1);
  PlatformTools.logInfo('simplified:\n', hs1);
});

test('logger - select sql 2', () => {
  const sql = `SELECT * FROM t_hodl_order WHERE ( (round_id = $1 AND order_state IN ($2, $3)) ) AND deleted_at IS NULL ORDER BY created_at DESC`;

  PlatformTools.logInfo('original:\n', sql);

  const ss1 = simplifySql(sql);
  const hs1 = PlatformTools.highlightSql(ss1);
  PlatformTools.logInfo('simplified:\n', hs1);
});

test('logger - insert sql', () => {
  const sql = `INSERT INTO "t_api_key"("id", "created_at", "updated_at", "deleted_at", "user_id", "algo_type",
 "exchange_id", "exchange_user_id", "key", "secret", "password", "subaccount", "remark", "account_id")
   VALUES ($1, DEFAULT, DEFAULT, DEFAULT, $2, $3, $4, $5, $6, $7, $8, DEFAULT, DEFAULT, $9)
     RETURNING "created_at", "updated_at", "deleted_at"
`;

  PlatformTools.logInfo('original:\n', sql);

  const ss1 = simplifySql(sql);
  const hs1 = PlatformTools.highlightSql(ss1);
  PlatformTools.logInfo('simplified:\n', hs1);
});
