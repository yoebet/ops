
CALL refresh_continuous_aggregate('tm.t_fp_5s_p1', '2024-08-15', '2024-08-18');

-- SELECT remove_continuous_aggregate_policy('tm.t_kline_1s');

-- SELECT remove_retention_policy('tm.t_kline_1s');

-- SELECT _timescaledb_functions.start_background_workers();

EXPLAIN (ANALYZE, COSTS OFF)
SELECT *
FROM tm.t_fp_5s_p4;
