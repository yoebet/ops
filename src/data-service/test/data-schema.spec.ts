import { Test } from '@nestjs/testing';
import * as fs from 'fs';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { TimeLevel } from '@/db/models/time-level';
import { DB_SCHEMA } from '@/env';

// const DB_SCHEMA = 'tm';

jest.setTimeout(60_000);

function buildKlineTables(tls: TimeLevel[]) {
  const sqls = [];

  for (const tl of tls) {
    const { interval } = tl;
    const table = `kline_${interval}`;
    const ftable = `${DB_SCHEMA}.${table}`;

    sqls.push(`
-- ${interval}

create table ${ftable}
(
    time     timestamp(6) with time zone not null,
    ex       varchar(32)                 not null,
    market   varchar(32)                 not null,
    symbol   varchar(32)                 not null,
    base     varchar(16)                 not null,
    quote    varchar(16)                 not null,
    interval varchar(4)                  not null,
    tds      integer                     not null,
    size     numeric                     not null,
    amount   numeric                     not null,
    bc       integer                     null,
    bs       numeric                     null,
    ba       numeric                     null,
    sc       integer                     null,
    ss       numeric                     null,
    sa       numeric                     null,
    open     numeric                     not null,
    high     numeric                     not null,
    low      numeric                     not null,
    close    numeric                     not null,
    p_ch     numeric                     null,
    p_avg    numeric                     null,
    p_cp     numeric                     null,
    p_ap     numeric                     null
);

CREATE UNIQUE INDEX index_${table}_u_tes ON ${ftable} (time, ex, symbol);

CREATE INDEX index_${table}_st ON ${ftable} (time, symbol);
CREATE INDEX index_${table}_espcp ON ${ftable} (ex, symbol, p_cp);
CREATE INDEX index_${table}_espap ON ${ftable} (ex, symbol, p_ap);

SELECT create_hypertable('${ftable}', by_range('time'));

SELECT add_dimension('${ftable}', by_hash('symbol', 16));
`);
  }

  const content = sqls.join('\n');

  fs.writeFileSync('data-schema/01_kline.sql', content);
}

function buildKlineData(tls: TimeLevel[]) {
  const sqls = [];

  for (const tl of tls) {
    const { interval } = tl;
    const table = `kline_${interval}`;
    const ftable = `${DB_SCHEMA}.${table}`;

    sqls.push(`
-- ${interval}

update ${ftable}
set p_ch=close - open,
    p_avg=case when size = 0 then 0 else amount / size end,
    p_cp=case when open = 0 then 0 else (close - open) / open * 100 end,
    p_ap=case when low = 0 then 0 else abs(high - low) / low * 100 end;
`);
  }

  const content = sqls.join('\n');

  fs.writeFileSync('data-schema/01_kline_data.sql', content);
}

function buildKlineViews(tls: TimeLevel[]) {
  const sqls = [];

  for (const tl of tls) {
    const { interval } = tl;
    const table = `kline_${interval}`;
    const ftable = `${DB_SCHEMA}.${table}`;
    const fview = `${DB_SCHEMA}.klinex_${interval}`;

    sqls.push(`
-- ${interval}

CREATE VIEW ${fview} AS
SELECT time_bucket('${interval}'::interval, "time") as time,
       ex,
       market,
       symbol,
       base,
       quote,
       interval,
       tds,
       size,
       amount,
       bc,
       bs,
       ba,
       sc,
       ss,
       sa,
       open,
       high,
       low,
       close,
       p_ch,
       p_avg,
       p_cp,
       p_ap,
       date_part('year', time)     as year,
       date_part('quarter', time)  as quarter,
       date_part('month', time)    as month,
       date_part('week', time)     as week,
       date_part('day', time)      as day,
       date_part('dow', time)      as week_day,
       date_part('hour', time)     as hour
FROM ${ftable};
`);
  }

  const content = sqls.join('\n');

  fs.writeFileSync('data-schema/02_kline_view.sql', content);
}

describe('data-schema', () => {
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemConfigModule],
    }).compile();

    await moduleRef.init();
  });

  it('cs', async () => {
    const tls = await TimeLevel.find({
      order: {
        intervalSeconds: 'ASC',
      },
    });
    console.log(tls.map((tl) => tl.interval));

    buildKlineTables(tls);
    buildKlineData(tls);
    buildKlineViews(tls);
  });
});

it('symbol views', async () => {
  const content = `-- symbol_enabled

create view ${DB_SCHEMA}.symbol_enabled as
select sc.*
from ${DB_SCHEMA}.unified_symbol sc
where sc.deleted_at is null
  and sc.enabled = true;

-- ex_symbol_enabled

create view ${DB_SCHEMA}.ex_symbol_enabled as
select es.*
from ${DB_SCHEMA}.exchange_symbol es
         join ${DB_SCHEMA}.exchange_config ec on es.ex = ec.ex and ec.deleted_at is null and ec.enabled = true
         join ${DB_SCHEMA}.unified_symbol sc on es.symbol = sc.symbol and sc.deleted_at is null and sc.enabled = true
where es.deleted_at is null
  and es.enabled = true;
`;

  fs.writeFileSync('data-schema/00_symbols.sql', content);
});
