CREATE MATERIALIZED VIEW tm.v_trade_block
    WITH (timescaledb.continuous)
AS
SELECT time_bucket('1 ms'::interval, "time") as time,
       symbol,
       ex,
       trade_id,
       side,
       data_id,
       max(price)                            as price,
       max(size)                             as size,
       max(amount)                           as amount
FROM tm.t_trade t
where t.block = 1
group by 1, 2, 3, 4, 5, 6;


ALTER MATERIALIZED VIEW tm.v_trade_block set (timescaledb.materialized_only = false);

SELECT add_continuous_aggregate_policy('tm.v_trade_block', '1d', null, '10m');

CREATE INDEX idx_block_list_symbol_time ON tm.v_trade_block (symbol, time);
