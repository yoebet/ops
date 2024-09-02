
-- prl 2

CREATE MATERIALIZED VIEW tm.t_fp_1s_p2
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('1s'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 2)) * (pt * 2)          as pl,
       div(pl, (pt * 2)) * (pt * 2) + (pt * 2) as pu,
       '1s'                                as interval,
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
FROM tm.t_fp_1s_p1
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


-- prl 4

CREATE MATERIALIZED VIEW tm.t_fp_1s_p4
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('1s'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 4)) * (pt * 4)          as pl,
       div(pl, (pt * 4)) * (pt * 4) + (pt * 4) as pu,
       '1s'                                as interval,
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
FROM tm.t_fp_1s_p1
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


-- prl 8

CREATE MATERIALIZED VIEW tm.t_fp_1s_p8
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('1s'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 8)) * (pt * 8)          as pl,
       div(pl, (pt * 8)) * (pt * 8) + (pt * 8) as pu,
       '1s'                                as interval,
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
FROM tm.t_fp_1s_p1
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;
