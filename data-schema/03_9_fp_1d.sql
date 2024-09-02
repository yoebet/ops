
-- prl 1

CREATE MATERIALIZED VIEW tm.t_fp_1d_p1
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('1d'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       pl,
       pu,
       '1d'                                as interval,
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
FROM tm.t_fp_4h_p1
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


-- prl 32

CREATE MATERIALIZED VIEW tm.t_fp_1d_p32
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('1d'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 32)) * (pt * 32)          as pl,
       div(pl, (pt * 32)) * (pt * 32) + (pt * 32) as pu,
       '1d'                                as interval,
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
FROM tm.t_fp_1d_p1
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


-- prl 64

CREATE MATERIALIZED VIEW tm.t_fp_1d_p64
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('1d'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 64)) * (pt * 64)          as pl,
       div(pl, (pt * 64)) * (pt * 64) + (pt * 64) as pu,
       '1d'                                as interval,
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
FROM tm.t_fp_1d_p32
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


-- prl 128

CREATE MATERIALIZED VIEW tm.t_fp_1d_p128
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('1d'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 128)) * (pt * 128)          as pl,
       div(pl, (pt * 128)) * (pt * 128) + (pt * 128) as pu,
       '1d'                                as interval,
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
FROM tm.t_fp_1d_p32
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


-- prl 256

CREATE MATERIALIZED VIEW tm.t_fp_1d_p256
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('1d'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 256)) * (pt * 256)          as pl,
       div(pl, (pt * 256)) * (pt * 256) + (pt * 256) as pu,
       '1d'                                as interval,
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
FROM tm.t_fp_1d_p32
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


-- prl 512

CREATE MATERIALIZED VIEW tm.t_fp_1d_p512
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('1d'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 512)) * (pt * 512)          as pl,
       div(pl, (pt * 512)) * (pt * 512) + (pt * 512) as pu,
       '1d'                                as interval,
       512                                   as prl,
       sum(tds)                            as tds,
       sum(size)                           as size,
       sum(amount)                         as amount,
       sum(bc)                             as bc,
       sum(bs)                             as bs,
       sum(ba)                             as ba,
       sum(sc)                             as sc,
       sum(ss)                             as ss,
       sum(sa)                             as sa
FROM tm.t_fp_1d_p256
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


-- prl 1024

CREATE MATERIALIZED VIEW tm.t_fp_1d_p1024
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('1d'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 1024)) * (pt * 1024)          as pl,
       div(pl, (pt * 1024)) * (pt * 1024) + (pt * 1024) as pu,
       '1d'                                as interval,
       1024                                   as prl,
       sum(tds)                            as tds,
       sum(size)                           as size,
       sum(amount)                         as amount,
       sum(bc)                             as bc,
       sum(bs)                             as bs,
       sum(ba)                             as ba,
       sum(sc)                             as sc,
       sum(ss)                             as ss,
       sum(sa)                             as sa
FROM tm.t_fp_1d_p256
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


-- prl 2048

CREATE MATERIALIZED VIEW tm.t_fp_1d_p2048
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('1d'::interval, "time")  as time,
       symbol,
       ex,
       market,
       base,
       quote,
       pt,
       div(pl, (pt * 2048)) * (pt * 2048)          as pl,
       div(pl, (pt * 2048)) * (pt * 2048) + (pt * 2048) as pu,
       '1d'                                as interval,
       2048                                   as prl,
       sum(tds)                            as tds,
       sum(size)                           as size,
       sum(amount)                         as amount,
       sum(bc)                             as bc,
       sum(bs)                             as bs,
       sum(ba)                             as ba,
       sum(sc)                             as sc,
       sum(ss)                             as ss,
       sum(sa)                             as sa
FROM tm.t_fp_1d_p256
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;
