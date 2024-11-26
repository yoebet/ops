
-- 1m

CREATE VIEW st.klinex_1m AS
SELECT time_bucket('1m'::interval, "time") as time,
       ex,
       market,
       symbol,
       base,
       quote,
       interval,
       tds,
       size,
       amount,
       bs,
       ba,
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
FROM st.kline_1m;


-- 5m

CREATE VIEW st.klinex_5m AS
SELECT time_bucket('5m'::interval, "time") as time,
       ex,
       market,
       symbol,
       base,
       quote,
       interval,
       tds,
       size,
       amount,
       bs,
       ba,
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
FROM st.kline_5m;


-- 15m

CREATE VIEW st.klinex_15m AS
SELECT time_bucket('15m'::interval, "time") as time,
       ex,
       market,
       symbol,
       base,
       quote,
       interval,
       tds,
       size,
       amount,
       bs,
       ba,
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
FROM st.kline_15m;


-- 1h

CREATE VIEW st.klinex_1h AS
SELECT time_bucket('1h'::interval, "time") as time,
       ex,
       market,
       symbol,
       base,
       quote,
       interval,
       tds,
       size,
       amount,
       bs,
       ba,
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
FROM st.kline_1h;


-- 4h

CREATE VIEW st.klinex_4h AS
SELECT time_bucket('4h'::interval, "time") as time,
       ex,
       market,
       symbol,
       base,
       quote,
       interval,
       tds,
       size,
       amount,
       bs,
       ba,
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
FROM st.kline_4h;


-- 1d

CREATE VIEW st.klinex_1d AS
SELECT time_bucket('1d'::interval, "time") as time,
       ex,
       market,
       symbol,
       base,
       quote,
       interval,
       tds,
       size,
       amount,
       bs,
       ba,
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
FROM st.kline_1d;


-- 1w

CREATE VIEW st.klinex_1w AS
SELECT time_bucket('1w'::interval, "time") as time,
       ex,
       market,
       symbol,
       base,
       quote,
       interval,
       tds,
       size,
       amount,
       bs,
       ba,
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
FROM st.kline_1w;


-- 1o

CREATE VIEW st.klinex_1o AS
SELECT time_bucket('1o'::interval, "time") as time,
       ex,
       market,
       symbol,
       base,
       quote,
       interval,
       tds,
       size,
       amount,
       bs,
       ba,
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
FROM st.kline_1o;
