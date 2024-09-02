
-- v_trade_step_size

CREATE MATERIALIZED VIEW tm.v_trade_step_size
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('1d'::interval, "time")                 AS time,
       t.symbol,
       t.ex,
       sc.market,
       sc.base,
       sc.quote,
       'SIZE'                                              as group_type,
       floor(size / sc.size_ticker)                        as part_id,
       count(1)                                            as tds,
       sum(size)                                           as size,
       sum(amount)                                         as amount,
       sum(case when side = 'buy' then 1 else 0 end)       as bc,
       sum(case when side = 'buy' then size else 0 end)    as bs,
       sum(case when side = 'buy' then amount else 0 end)  as ba,
       sum(case when side = 'sell' then 1 else 0 end)      as sc,
       sum(case when side = 'sell' then size else 0 end)   as ss,
       sum(case when side = 'sell' then amount else 0 end) as sa
FROM tm.t_trade t,
     tm.t_symbol_config sc
WHERE t.symbol = sc.symbol
GROUP BY 1, 2, 3, 4, 5, 6, 7, 8
ORDER BY 1, 2, 3, 4;


ALTER MATERIALIZED VIEW tm.v_trade_step_size set (timescaledb.materialized_only = false);

SELECT add_continuous_aggregate_policy('tm.v_trade_step_size', '2d', null, '10m');

CREATE INDEX idx_trade_step_size_symbol_time ON tm.v_trade_step_size (symbol, time);

-- v_trade_step_amount

CREATE MATERIALIZED VIEW tm.v_trade_step_amount
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('1d'::interval, "time")                 AS time,
       t.symbol,
       t.ex,
       sc.market,
       sc.base,
       sc.quote,
       'AMOUNT'                                            as group_type,
       floor(amount / sc.amount_ticker)                    as part_id,
       count(1)                                            as tds,
       sum(size)                                           as size,
       sum(amount)                                         as amount,
       sum(case when side = 'buy' then 1 else 0 end)       as bc,
       sum(case when side = 'buy' then size else 0 end)    as bs,
       sum(case when side = 'buy' then amount else 0 end)  as ba,
       sum(case when side = 'sell' then 1 else 0 end)      as sc,
       sum(case when side = 'sell' then size else 0 end)   as ss,
       sum(case when side = 'sell' then amount else 0 end) as sa
FROM tm.t_trade t,
     tm.t_symbol_config sc
WHERE t.symbol = sc.symbol
GROUP BY 1, 2, 3, 4, 5, 6, 7, 8
ORDER BY 1, 2, 3, 4;


ALTER MATERIALIZED VIEW tm.v_trade_step_amount set (timescaledb.materialized_only = false);

SELECT add_continuous_aggregate_policy('tm.v_trade_step_amount', '2d', null, '10m');

CREATE INDEX idx_trade_step_amount_symbol_time ON tm.v_trade_step_amount (symbol, time);


-- v_trade_step

create view tm.v_trade_step as
select *
from tm.v_trade_step_size
union all
select *
from tm.v_trade_step_amount;
