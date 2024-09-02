
-- 5s

CREATE MATERIALIZED VIEW tm.t_kline_5s
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('5s'::interval, "time") AS time,
       symbol,
       ex,
       market,
       base,
       quote,
       '5s'                                as interval,
       sum(tds)                            as tds,
       sum(size)                           as size,
       sum(amount)                         as amount,
       sum(bc)                             as bc,
       sum(bs)                             as bs,
       sum(ba)                             as ba,
       sum(sc)                             as sc,
       sum(ss)                             as ss,
       sum(sa)                             as sa,
       rollup(ohlcv)                       as ohlcv
FROM tm.t_kline_1s
GROUP BY 1, 2, 3, 4, 5, 6;

-- 30s

CREATE MATERIALIZED VIEW tm.t_kline_30s
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('30s'::interval, "time") AS time,
       symbol,
       ex,
       market,
       base,
       quote,
       '30s'                                as interval,
       sum(tds)                            as tds,
       sum(size)                           as size,
       sum(amount)                         as amount,
       sum(bc)                             as bc,
       sum(bs)                             as bs,
       sum(ba)                             as ba,
       sum(sc)                             as sc,
       sum(ss)                             as ss,
       sum(sa)                             as sa,
       rollup(ohlcv)                       as ohlcv
FROM tm.t_kline_5s
GROUP BY 1, 2, 3, 4, 5, 6;

-- 1m

CREATE MATERIALIZED VIEW tm.t_kline_1m
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('1m'::interval, "time") AS time,
       symbol,
       ex,
       market,
       base,
       quote,
       '1m'                                as interval,
       sum(tds)                            as tds,
       sum(size)                           as size,
       sum(amount)                         as amount,
       sum(bc)                             as bc,
       sum(bs)                             as bs,
       sum(ba)                             as ba,
       sum(sc)                             as sc,
       sum(ss)                             as ss,
       sum(sa)                             as sa,
       rollup(ohlcv)                       as ohlcv
FROM tm.t_kline_5s
GROUP BY 1, 2, 3, 4, 5, 6;

-- 5m

CREATE MATERIALIZED VIEW tm.t_kline_5m
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('5m'::interval, "time") AS time,
       symbol,
       ex,
       market,
       base,
       quote,
       '5m'                                as interval,
       sum(tds)                            as tds,
       sum(size)                           as size,
       sum(amount)                         as amount,
       sum(bc)                             as bc,
       sum(bs)                             as bs,
       sum(ba)                             as ba,
       sum(sc)                             as sc,
       sum(ss)                             as ss,
       sum(sa)                             as sa,
       rollup(ohlcv)                       as ohlcv
FROM tm.t_kline_1m
GROUP BY 1, 2, 3, 4, 5, 6;

-- 15m

CREATE MATERIALIZED VIEW tm.t_kline_15m
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('15m'::interval, "time") AS time,
       symbol,
       ex,
       market,
       base,
       quote,
       '15m'                                as interval,
       sum(tds)                            as tds,
       sum(size)                           as size,
       sum(amount)                         as amount,
       sum(bc)                             as bc,
       sum(bs)                             as bs,
       sum(ba)                             as ba,
       sum(sc)                             as sc,
       sum(ss)                             as ss,
       sum(sa)                             as sa,
       rollup(ohlcv)                       as ohlcv
FROM tm.t_kline_1m
GROUP BY 1, 2, 3, 4, 5, 6;

-- 1h

CREATE MATERIALIZED VIEW tm.t_kline_1h
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('1h'::interval, "time") AS time,
       symbol,
       ex,
       market,
       base,
       quote,
       '1h'                                as interval,
       sum(tds)                            as tds,
       sum(size)                           as size,
       sum(amount)                         as amount,
       sum(bc)                             as bc,
       sum(bs)                             as bs,
       sum(ba)                             as ba,
       sum(sc)                             as sc,
       sum(ss)                             as ss,
       sum(sa)                             as sa,
       rollup(ohlcv)                       as ohlcv
FROM tm.t_kline_15m
GROUP BY 1, 2, 3, 4, 5, 6;

-- 4h

CREATE MATERIALIZED VIEW tm.t_kline_4h
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('4h'::interval, "time") AS time,
       symbol,
       ex,
       market,
       base,
       quote,
       '4h'                                as interval,
       sum(tds)                            as tds,
       sum(size)                           as size,
       sum(amount)                         as amount,
       sum(bc)                             as bc,
       sum(bs)                             as bs,
       sum(ba)                             as ba,
       sum(sc)                             as sc,
       sum(ss)                             as ss,
       sum(sa)                             as sa,
       rollup(ohlcv)                       as ohlcv
FROM tm.t_kline_15m
GROUP BY 1, 2, 3, 4, 5, 6;

-- 1d

CREATE MATERIALIZED VIEW tm.t_kline_1d
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('1d'::interval, "time") AS time,
       symbol,
       ex,
       market,
       base,
       quote,
       '1d'                                as interval,
       sum(tds)                            as tds,
       sum(size)                           as size,
       sum(amount)                         as amount,
       sum(bc)                             as bc,
       sum(bs)                             as bs,
       sum(ba)                             as ba,
       sum(sc)                             as sc,
       sum(ss)                             as ss,
       sum(sa)                             as sa,
       rollup(ohlcv)                       as ohlcv
FROM tm.t_kline_4h
GROUP BY 1, 2, 3, 4, 5, 6;