
-- t_trade

create sequence seq_data_id cache 50;

create table tm.t_trade
(
    time        timestamp(6) with time zone                                             not null,
    symbol      varchar(32)                                                             not null,
    ex          varchar(32)                                                             not null,
    trade_id    varchar(64)                                                             not null,
    price       numeric                                                                 not null,
    csize       numeric                                                                 not null,
    size        numeric                                                                 not null,
    amount      numeric                                                                 not null,
    side        varchar(16)                                                             not null,
    data_id     bigint                      default nextval('tm.seq_data_id'::regclass) not null,
    block       integer                                                                 not null,
    create_time timestamp(6) with time zone default now()                               not null
);

CREATE UNIQUE INDEX t_trade_ex_symbol_trade_id_time_index ON tm.t_trade (ex, symbol, trade_id, time);

CREATE INDEX t_trade_symbol_time_index ON tm.t_trade (symbol, time);

SELECT create_hypertable('tm.t_trade', by_range('time'));

SELECT add_dimension('tm.t_trade', by_hash('symbol', 16));

SELECT set_chunk_time_interval('tm.t_trade', INTERVAL '12 hours');

SELECT add_retention_policy('tm.t_trade', INTERVAL '7 days');


-- t_kline_1s

CREATE MATERIALIZED VIEW tm.t_kline_1s
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('1s'::interval, "time")                 AS time,
       t_trade.symbol,
       ex,
       sc.market,
       sc.base,
       sc.quote,
       '1s'                                                as interval,
       count(*)                                            as tds,
       sum(size)                                           as size,
       sum(amount)                                         as amount,
       sum(case when side = 'buy' then 1 else 0 end)       as bc,
       sum(case when side = 'buy' then size else 0 end)    as bs,
       sum(case when side = 'buy' then amount else 0 end)  as ba,
       sum(case when side = 'sell' then 1 else 0 end)      as sc,
       sum(case when side = 'sell' then size else 0 end)   as ss,
       sum(case when side = 'sell' then amount else 0 end) as sa,
       candlestick_agg(time, price, size)                  as ohlcv
FROM tm.t_trade
         join tm.t_symbol_config sc on sc.symbol = t_trade.symbol
GROUP BY 1, 2, 3, 4, 5, 6;


SELECT set_chunk_time_interval('tm.t_kline_1s', INTERVAL '12 hours');


-- t_fp_1s_p1

CREATE MATERIALIZED VIEW tm.t_fp_1s_p1
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('1 s'::interval, "time")                AS time,
       t_trade.symbol,
       sc.price_tick_str::numeric                          as pt,
       ex,
       sc.market,
       sc.base,
       sc.quote,
       div(price, sc.price_tick_str::numeric) *
       sc.price_tick_str::numeric                          as pl,
       div(price, sc.price_tick_str::numeric) * sc.price_tick_str::numeric +
       sc.price_tick_str::numeric                          as pu,
       '1s'                                                as interval,
       1                                                   as prl,
       count(*)                                            as tds,
       sum(size)                                           as size,
       sum(amount)                                         as amount,
       sum(case when side = 'buy' then 1 else 0 end)       as bc,
       sum(case when side = 'buy' then size else 0 end)    as bs,
       sum(case when side = 'buy' then amount else 0 end)  as ba,
       sum(case when side = 'sell' then 1 else 0 end)      as sc,
       sum(case when side = 'sell' then size else 0 end)   as ss,
       sum(case when side = 'sell' then amount else 0 end) as sa
FROM tm.t_trade
         join tm.t_symbol_config sc on sc.symbol = t_trade.symbol
GROUP BY 1, 2, 3, 3, 4, 5, 6, 7, 8, 9;


SELECT set_chunk_time_interval('tm.t_fp_1s_p1', INTERVAL '12 hours');
