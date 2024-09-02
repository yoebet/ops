import { Test } from '@nestjs/testing';
import * as fs from 'fs';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { TimeLevel } from '@/db/models/time-level';
import { DB_SCHEMA } from '@/env';

// const DB_SCHEMA = 'tm';

jest.setTimeout(60_000);

function getIntervalPolicy(tl: TimeLevel) {
  const { interval, intervalSeconds } = tl;
  let n = +interval.substring(0, interval.length - 1);
  let retention = null;
  let aggStartOffset = intervalSeconds < 24 * 60 * 60 ? '1d' : '3d';
  // let aggEndOffset = null;
  let aggScheduleInterval =
    intervalSeconds <= 60 ? '5s' : tl.rollupFromInterval || '20s';
  if (intervalSeconds === 1) {
    retention = '2d';
  } else if (intervalSeconds < 30) {
    retention = '5d';
  } else if (intervalSeconds <= 60) {
    retention = '30d';
  } else if (intervalSeconds < 15 * 60) {
    retention = '60d';
  }
  return {
    retention,
    aggStartOffset,
    // aggEndOffset,
    aggScheduleInterval,
  };
}

const tradeAggs = `sum(tds)                            as tds,
       sum(size)                           as size,
       sum(amount)                         as amount,
       sum(bc)                             as bc,
       sum(bs)                             as bs,
       sum(ba)                             as ba,
       sum(sc)                             as sc,
       sum(ss)                             as ss,
       sum(sa)                             as sa`;

function buildKlineViews(
  tls: TimeLevel[],
  views: string[],
  childViews,
  contAggPolicies,
  retentionPolicies,
) {
  const sqls = [];

  for (const tl of tls) {
    const { interval, rollupFromInterval: fromInterval } = tl;
    if (interval === '1s') {
      continue;
    }
    const baseView = `t_kline_${fromInterval}`;
    const view = `t_kline_${interval}`;
    views.push(`t_kline_${interval}`);
    if (!childViews[baseView]) {
      childViews[baseView] = [];
    }
    childViews[baseView].push(view);
    const {
      retention,
      aggStartOffset,
      // aggEndOffset,
      aggScheduleInterval,
    } = getIntervalPolicy(tl);
    sqls.push(`
-- ${interval}

CREATE MATERIALIZED VIEW ${DB_SCHEMA}.${view}
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('${interval}'::interval, "time") AS time,
       symbol,
       ex,
       market,
       base,
       quote,
       '${interval}'                                as interval,
       ${tradeAggs},
       rollup(ohlcv)                       as ohlcv
FROM ${DB_SCHEMA}.${baseView}
GROUP BY 1, 2, 3, 4, 5, 6;`);
    if (retention) {
      retentionPolicies.push(
        `SELECT add_retention_policy('${DB_SCHEMA}.${view}', INTERVAL '${retention}');`,
      );
    }
    contAggPolicies.push(
      `SELECT add_continuous_aggregate_policy('${DB_SCHEMA}.${view}', '${aggStartOffset}', '${aggScheduleInterval}', '${aggScheduleInterval}');`,
    );
  }

  const content = sqls.join('\n');

  fs.writeFileSync('data-schema/02_kline.sql', content);
}

function buildFpViews(
  tls: TimeLevel[],
  views: string[],
  childViews,
  contAggPolicies,
  retentionPolicies,
) {
  let fpi = 0;
  for (const tl of tls) {
    fpi++;
    const { interval, rollupFromInterval: fromInterval, prlFrom, prlTo } = tl;

    console.log(`fp ${interval}: ${fromInterval}, ${prlFrom} - ${prlTo}`);
    const {
      retention,
      aggStartOffset,
      // aggEndOffset,
      aggScheduleInterval,
    } = getIntervalPolicy(tl);

    const fpSqls = [];

    let basePrl = 1;
    for (let prl = 1; prl <= prlTo; prl *= 2) {
      if (prl === 1 && interval === '1s') {
        continue;
      }
      const baseView =
        prl === 1
          ? `t_fp_${fromInterval}_p${1}`
          : `t_fp_${interval}_p${basePrl}`;
      const view = `t_fp_${interval}_p${prl}`;
      views.push(view);
      if (!childViews[baseView]) {
        childViews[baseView] = [];
      }
      childViews[baseView].push(view);
      let plpu = `pl,
       pu,`;
      if (prl > 1) {
        const st = `(pt * ${prl})`;
        plpu = `div(pl, ${st}) * ${st}          as pl,
       div(pl, ${st}) * ${st} + ${st} as pu,`;
      }
      fpSqls.push(`
-- prl ${prl}

CREATE MATERIALIZED VIEW ${DB_SCHEMA}.${view}
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('${interval}'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       ${plpu}
       '${interval}'                                as interval,
       ${prl}                                   as prl,
       ${tradeAggs}
FROM ${DB_SCHEMA}.${baseView}
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;
`);

      if (retention) {
        retentionPolicies.push(
          `SELECT add_retention_policy('${DB_SCHEMA}.${view}', INTERVAL '${retention}');`,
        );
      }
      contAggPolicies.push(
        `SELECT add_continuous_aggregate_policy('${DB_SCHEMA}.${view}', '${aggStartOffset}', '${aggScheduleInterval}', '${aggScheduleInterval}');`,
      );
      if (prl >= basePrl * 8) {
        basePrl = prl;
      }
      if (prl < prlFrom >> 1) {
        prl = prlFrom >> 1;
      }
    }

    const content = fpSqls.join('\n');

    fs.writeFileSync(
      `data-schema/03_${fpi}_fp_${interval.toLowerCase()}.sql`,
      content,
    );
  }
}

function printViewTree(childViews, root) {
  const lines = [];

  function printTree(view, level = 1) {
    lines.push('\t'.repeat(level - 1) + view);
    const children = childViews[view];
    if (children) {
      for (const child of children) {
        printTree(child, level + 1);
      }
    }
  }

  printTree(root);

  return lines.join('\n');
}

describe('ExchangeConfigService', () => {
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemConfigModule],
    }).compile();

    await moduleRef.init();
  });

  describe('data-schema', () => {
    it('cs', async () => {
      let tls = await TimeLevel.find({
        order: {
          intervalSeconds: 'ASC',
        },
      });
      console.log(tls.map((tl) => tl.interval));

      const rootTable = 't_trade';
      const views = ['t_kline_1s', 't_fp_1s_p1'];
      const childViews = { [rootTable]: [...views] };

      const contAggPolicies = [
        `SELECT add_continuous_aggregate_policy('${DB_SCHEMA}.t_kline_1s', '1d', '1s', '3s');`,
        `SELECT add_continuous_aggregate_policy('${DB_SCHEMA}.t_fp_1s_p1', '1d', '1s', '3s');`,
      ];
      const retentionPolicies = [
        `SELECT add_retention_policy('${DB_SCHEMA}.t_kline_1s', INTERVAL '2d');`,
        `SELECT add_retention_policy('${DB_SCHEMA}.t_fp_1s_p1', INTERVAL '2d');`,
      ];

      buildKlineViews(
        tls,
        views,
        childViews,
        contAggPolicies,
        retentionPolicies,
      );

      buildFpViews(tls, views, childViews, contAggPolicies, retentionPolicies);

      fs.writeFileSync(
        `data-schema/04_1_aggregate_policy.sql`,
        contAggPolicies.join('\n'),
      );

      fs.writeFileSync(
        `data-schema/04_2_retention_policy.sql`,
        retentionPolicies.join('\n'),
      );

      fs.writeFileSync(
        `data-schema/04_3_index.sql`,
        views
          .map(
            (v) =>
              `CREATE INDEX ${v}_symbol_time_index ON ${DB_SCHEMA}.${v} (symbol, time);
CREATE INDEX ${v}_ex_symbol_time_index ON ${DB_SCHEMA}.${v} (ex, symbol, time);`,
          )
          .join('\n'),
      );

      const vContent = views
        .map(
          (v) =>
            `ALTER MATERIALIZED VIEW ${DB_SCHEMA}.${v} set (timescaledb.materialized_only = false);`,
        )
        .join('\n');
      fs.writeFileSync(`data-schema/04_4_materialized_only.sql`, vContent);

      const rContent = views
        .map(
          (v) =>
            `SELECT remove_continuous_aggregate_policy('${DB_SCHEMA}.${v}');`,
        )
        .join('\n');
      fs.writeFileSync(
        `data-schema/04_5_remove_aggregate_policy.sql`,
        rContent,
      );

      fs.writeFileSync(`data-schema/05_1_views.txt`, views.join('\n'));

      const treeText = printViewTree(childViews, rootTable);
      fs.writeFileSync(`data-schema/05_2_view_tree.txt`, treeText);

      fs.writeFileSync(
        `data-schema/06_2_drop_views.txt`,
        views
          .reverse()
          .map((v) => `drop materialized view ${DB_SCHEMA}.${v};`)
          .join('\n'),
      );
    });
  });
});
