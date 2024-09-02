
-- prl 1

CREATE MATERIALIZED VIEW tm.t_fp_15m_p1
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('15m'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       pl,
       pu,
       '15m'                                as interval,
       1                                   as prl,
       sum(tds)                            as tds,
       sum(size)                           as size,
       sum(amount)                         as amount,
       sum(bc)                             as bc,
       sum(bs)                             as bs,
       sum(ba)                             as ba,
       sum(sc)                             as sc,
       sum(ss)                             as ss,
       sum(sa)                             as sa
FROM tm.t_fp_1m_p1
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


-- prl 2

CREATE MATERIALIZED VIEW tm.t_fp_15m_p2
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('15m'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 2)) * (pt * 2)          as pl,
       div(pl, (pt * 2)) * (pt * 2) + (pt * 2) as pu,
       '15m'                                as interval,
       2                                   as prl,
       sum(tds)                            as tds,
       sum(size)                           as size,
       sum(amount)                         as amount,
       sum(bc)                             as bc,
       sum(bs)                             as bs,
       sum(ba)                             as ba,
       sum(sc)                             as sc,
       sum(ss)                             as ss,
       sum(sa)                             as sa
FROM tm.t_fp_15m_p1
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


-- prl 4

CREATE MATERIALIZED VIEW tm.t_fp_15m_p4
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('15m'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 4)) * (pt * 4)          as pl,
       div(pl, (pt * 4)) * (pt * 4) + (pt * 4) as pu,
       '15m'                                as interval,
       4                                   as prl,
       sum(tds)                            as tds,
       sum(size)                           as size,
       sum(amount)                         as amount,
       sum(bc)                             as bc,
       sum(bs)                             as bs,
       sum(ba)                             as ba,
       sum(sc)                             as sc,
       sum(ss)                             as ss,
       sum(sa)                             as sa
FROM tm.t_fp_15m_p1
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


-- prl 8

CREATE MATERIALIZED VIEW tm.t_fp_15m_p8
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('15m'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 8)) * (pt * 8)          as pl,
       div(pl, (pt * 8)) * (pt * 8) + (pt * 8) as pu,
       '15m'                                as interval,
       8                                   as prl,
       sum(tds)                            as tds,
       sum(size)                           as size,
       sum(amount)                         as amount,
       sum(bc)                             as bc,
       sum(bs)                             as bs,
       sum(ba)                             as ba,
       sum(sc)                             as sc,
       sum(ss)                             as ss,
       sum(sa)                             as sa
FROM tm.t_fp_15m_p1
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


-- prl 16

CREATE MATERIALIZED VIEW tm.t_fp_15m_p16
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('15m'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 16)) * (pt * 16)          as pl,
       div(pl, (pt * 16)) * (pt * 16) + (pt * 16) as pu,
       '15m'                                as interval,
       16                                   as prl,
       sum(tds)                            as tds,
       sum(size)                           as size,
       sum(amount)                         as amount,
       sum(bc)                             as bc,
       sum(bs)                             as bs,
       sum(ba)                             as ba,
       sum(sc)                             as sc,
       sum(ss)                             as ss,
       sum(sa)                             as sa
FROM tm.t_fp_15m_p8
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


-- prl 32

CREATE MATERIALIZED VIEW tm.t_fp_15m_p32
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('15m'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 32)) * (pt * 32)          as pl,
       div(pl, (pt * 32)) * (pt * 32) + (pt * 32) as pu,
       '15m'                                as interval,
       32                                   as prl,
       sum(tds)                            as tds,
       sum(size)                           as size,
       sum(amount)                         as amount,
       sum(bc)                             as bc,
       sum(bs)                             as bs,
       sum(ba)                             as ba,
       sum(sc)                             as sc,
       sum(ss)                             as ss,
       sum(sa)                             as sa
FROM tm.t_fp_15m_p8
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


-- prl 64

CREATE MATERIALIZED VIEW tm.t_fp_15m_p64
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('15m'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 64)) * (pt * 64)          as pl,
       div(pl, (pt * 64)) * (pt * 64) + (pt * 64) as pu,
       '15m'                                as interval,
       64                                   as prl,
       sum(tds)                            as tds,
       sum(size)                           as size,
       sum(amount)                         as amount,
       sum(bc)                             as bc,
       sum(bs)                             as bs,
       sum(ba)                             as ba,
       sum(sc)                             as sc,
       sum(ss)                             as ss,
       sum(sa)                             as sa
FROM tm.t_fp_15m_p8
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


-- prl 128

CREATE MATERIALIZED VIEW tm.t_fp_15m_p128
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('15m'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 128)) * (pt * 128)          as pl,
       div(pl, (pt * 128)) * (pt * 128) + (pt * 128) as pu,
       '15m'                                as interval,
       128                                   as prl,
       sum(tds)                            as tds,
       sum(size)                           as size,
       sum(amount)                         as amount,
       sum(bc)                             as bc,
       sum(bs)                             as bs,
       sum(ba)                             as ba,
       sum(sc)                             as sc,
       sum(ss)                             as ss,
       sum(sa)                             as sa
FROM tm.t_fp_15m_p64
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


-- prl 256

CREATE MATERIALIZED VIEW tm.t_fp_15m_p256
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('15m'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 256)) * (pt * 256)          as pl,
       div(pl, (pt * 256)) * (pt * 256) + (pt * 256) as pu,
       '15m'                                as interval,
       256                                   as prl,
       sum(tds)                            as tds,
       sum(size)                           as size,
       sum(amount)                         as amount,
       sum(bc)                             as bc,
       sum(bs)                             as bs,
       sum(ba)                             as ba,
       sum(sc)                             as sc,
       sum(ss)                             as ss,
       sum(sa)                             as sa
FROM tm.t_fp_15m_p64
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;
