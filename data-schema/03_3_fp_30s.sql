
-- prl 1

CREATE MATERIALIZED VIEW tm.t_fp_30s_p1
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('30s'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       pl,
       pu,
       '30s'                                as interval,
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
FROM tm.t_fp_5s_p1
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


-- prl 2

CREATE MATERIALIZED VIEW tm.t_fp_30s_p2
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('30s'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 2)) * (pt * 2)          as pl,
       div(pl, (pt * 2)) * (pt * 2) + (pt * 2) as pu,
       '30s'                                as interval,
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
FROM tm.t_fp_30s_p1
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


-- prl 4

CREATE MATERIALIZED VIEW tm.t_fp_30s_p4
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('30s'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 4)) * (pt * 4)          as pl,
       div(pl, (pt * 4)) * (pt * 4) + (pt * 4) as pu,
       '30s'                                as interval,
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
FROM tm.t_fp_30s_p1
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


-- prl 8

CREATE MATERIALIZED VIEW tm.t_fp_30s_p8
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('30s'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 8)) * (pt * 8)          as pl,
       div(pl, (pt * 8)) * (pt * 8) + (pt * 8) as pu,
       '30s'                                as interval,
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
FROM tm.t_fp_30s_p1
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


-- prl 16

CREATE MATERIALIZED VIEW tm.t_fp_30s_p16
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('30s'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 16)) * (pt * 16)          as pl,
       div(pl, (pt * 16)) * (pt * 16) + (pt * 16) as pu,
       '30s'                                as interval,
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
FROM tm.t_fp_30s_p8
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


-- prl 32

CREATE MATERIALIZED VIEW tm.t_fp_30s_p32
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('30s'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 32)) * (pt * 32)          as pl,
       div(pl, (pt * 32)) * (pt * 32) + (pt * 32) as pu,
       '30s'                                as interval,
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
FROM tm.t_fp_30s_p8
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;
