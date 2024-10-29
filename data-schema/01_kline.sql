
-- 1m

create table md.kline_1m
(
    time     timestamp(6) with time zone not null,
    ex       varchar(32)                 not null,
    market   varchar(32)                 not null,
    symbol   varchar(32)                 not null,
    base     varchar(16)                 not null,
    quote    varchar(16)                 not null,
    interval varchar(4)                  not null,
    tds      integer                     not null,
    size     numeric                     not null,
    amount   numeric                     not null,
    bc       integer                     null,
    bs       numeric                     null,
    ba       numeric                     null,
    sc       integer                     null,
    ss       numeric                     null,
    sa       numeric                     null,
    open     numeric                     not null,
    high     numeric                     not null,
    low      numeric                     not null,
    close    numeric                     not null,
    p_ch     numeric                     null,
    p_avg    numeric                     null,
    p_cp     numeric                     null,
    p_ap     numeric                     null
);

CREATE UNIQUE INDEX index_kline_1m_u_tes ON md.kline_1m (time, ex, symbol);

CREATE INDEX index_kline_1m_st ON md.kline_1m (time, symbol);
CREATE INDEX index_kline_1m_espcp ON md.kline_1m (ex, symbol, p_cp);
CREATE INDEX index_kline_1m_espap ON md.kline_1m (ex, symbol, p_ap);

SELECT create_hypertable('md.kline_1m', by_range('time'));

SELECT add_dimension('md.kline_1m', by_hash('symbol', 16));


-- 5m

create table md.kline_5m
(
    time     timestamp(6) with time zone not null,
    ex       varchar(32)                 not null,
    market   varchar(32)                 not null,
    symbol   varchar(32)                 not null,
    base     varchar(16)                 not null,
    quote    varchar(16)                 not null,
    interval varchar(4)                  not null,
    tds      integer                     not null,
    size     numeric                     not null,
    amount   numeric                     not null,
    bc       integer                     null,
    bs       numeric                     null,
    ba       numeric                     null,
    sc       integer                     null,
    ss       numeric                     null,
    sa       numeric                     null,
    open     numeric                     not null,
    high     numeric                     not null,
    low      numeric                     not null,
    close    numeric                     not null,
    p_ch     numeric                     null,
    p_avg    numeric                     null,
    p_cp     numeric                     null,
    p_ap     numeric                     null
);

CREATE UNIQUE INDEX index_kline_5m_u_tes ON md.kline_5m (time, ex, symbol);

CREATE INDEX index_kline_5m_st ON md.kline_5m (time, symbol);
CREATE INDEX index_kline_5m_espcp ON md.kline_5m (ex, symbol, p_cp);
CREATE INDEX index_kline_5m_espap ON md.kline_5m (ex, symbol, p_ap);

SELECT create_hypertable('md.kline_5m', by_range('time'));

SELECT add_dimension('md.kline_5m', by_hash('symbol', 16));


-- 15m

create table md.kline_15m
(
    time     timestamp(6) with time zone not null,
    ex       varchar(32)                 not null,
    market   varchar(32)                 not null,
    symbol   varchar(32)                 not null,
    base     varchar(16)                 not null,
    quote    varchar(16)                 not null,
    interval varchar(4)                  not null,
    tds      integer                     not null,
    size     numeric                     not null,
    amount   numeric                     not null,
    bc       integer                     null,
    bs       numeric                     null,
    ba       numeric                     null,
    sc       integer                     null,
    ss       numeric                     null,
    sa       numeric                     null,
    open     numeric                     not null,
    high     numeric                     not null,
    low      numeric                     not null,
    close    numeric                     not null,
    p_ch     numeric                     null,
    p_avg    numeric                     null,
    p_cp     numeric                     null,
    p_ap     numeric                     null
);

CREATE UNIQUE INDEX index_kline_15m_u_tes ON md.kline_15m (time, ex, symbol);

CREATE INDEX index_kline_15m_st ON md.kline_15m (time, symbol);
CREATE INDEX index_kline_15m_espcp ON md.kline_15m (ex, symbol, p_cp);
CREATE INDEX index_kline_15m_espap ON md.kline_15m (ex, symbol, p_ap);

SELECT create_hypertable('md.kline_15m', by_range('time'));

SELECT add_dimension('md.kline_15m', by_hash('symbol', 16));


-- 1h

create table md.kline_1h
(
    time     timestamp(6) with time zone not null,
    ex       varchar(32)                 not null,
    market   varchar(32)                 not null,
    symbol   varchar(32)                 not null,
    base     varchar(16)                 not null,
    quote    varchar(16)                 not null,
    interval varchar(4)                  not null,
    tds      integer                     not null,
    size     numeric                     not null,
    amount   numeric                     not null,
    bc       integer                     null,
    bs       numeric                     null,
    ba       numeric                     null,
    sc       integer                     null,
    ss       numeric                     null,
    sa       numeric                     null,
    open     numeric                     not null,
    high     numeric                     not null,
    low      numeric                     not null,
    close    numeric                     not null,
    p_ch     numeric                     null,
    p_avg    numeric                     null,
    p_cp     numeric                     null,
    p_ap     numeric                     null
);

CREATE UNIQUE INDEX index_kline_1h_u_tes ON md.kline_1h (time, ex, symbol);

CREATE INDEX index_kline_1h_st ON md.kline_1h (time, symbol);
CREATE INDEX index_kline_1h_espcp ON md.kline_1h (ex, symbol, p_cp);
CREATE INDEX index_kline_1h_espap ON md.kline_1h (ex, symbol, p_ap);

SELECT create_hypertable('md.kline_1h', by_range('time'));

SELECT add_dimension('md.kline_1h', by_hash('symbol', 16));


-- 4h

create table md.kline_4h
(
    time     timestamp(6) with time zone not null,
    ex       varchar(32)                 not null,
    market   varchar(32)                 not null,
    symbol   varchar(32)                 not null,
    base     varchar(16)                 not null,
    quote    varchar(16)                 not null,
    interval varchar(4)                  not null,
    tds      integer                     not null,
    size     numeric                     not null,
    amount   numeric                     not null,
    bc       integer                     null,
    bs       numeric                     null,
    ba       numeric                     null,
    sc       integer                     null,
    ss       numeric                     null,
    sa       numeric                     null,
    open     numeric                     not null,
    high     numeric                     not null,
    low      numeric                     not null,
    close    numeric                     not null,
    p_ch     numeric                     null,
    p_avg    numeric                     null,
    p_cp     numeric                     null,
    p_ap     numeric                     null
);

CREATE UNIQUE INDEX index_kline_4h_u_tes ON md.kline_4h (time, ex, symbol);

CREATE INDEX index_kline_4h_st ON md.kline_4h (time, symbol);
CREATE INDEX index_kline_4h_espcp ON md.kline_4h (ex, symbol, p_cp);
CREATE INDEX index_kline_4h_espap ON md.kline_4h (ex, symbol, p_ap);

SELECT create_hypertable('md.kline_4h', by_range('time'));

SELECT add_dimension('md.kline_4h', by_hash('symbol', 16));


-- 1d

create table md.kline_1d
(
    time     timestamp(6) with time zone not null,
    ex       varchar(32)                 not null,
    market   varchar(32)                 not null,
    symbol   varchar(32)                 not null,
    base     varchar(16)                 not null,
    quote    varchar(16)                 not null,
    interval varchar(4)                  not null,
    tds      integer                     not null,
    size     numeric                     not null,
    amount   numeric                     not null,
    bc       integer                     null,
    bs       numeric                     null,
    ba       numeric                     null,
    sc       integer                     null,
    ss       numeric                     null,
    sa       numeric                     null,
    open     numeric                     not null,
    high     numeric                     not null,
    low      numeric                     not null,
    close    numeric                     not null,
    p_ch     numeric                     null,
    p_avg    numeric                     null,
    p_cp     numeric                     null,
    p_ap     numeric                     null
);

CREATE UNIQUE INDEX index_kline_1d_u_tes ON md.kline_1d (time, ex, symbol);

CREATE INDEX index_kline_1d_st ON md.kline_1d (time, symbol);
CREATE INDEX index_kline_1d_espcp ON md.kline_1d (ex, symbol, p_cp);
CREATE INDEX index_kline_1d_espap ON md.kline_1d (ex, symbol, p_ap);

SELECT create_hypertable('md.kline_1d', by_range('time'));

SELECT add_dimension('md.kline_1d', by_hash('symbol', 16));


-- 1w

create table md.kline_1w
(
    time     timestamp(6) with time zone not null,
    ex       varchar(32)                 not null,
    market   varchar(32)                 not null,
    symbol   varchar(32)                 not null,
    base     varchar(16)                 not null,
    quote    varchar(16)                 not null,
    interval varchar(4)                  not null,
    tds      integer                     not null,
    size     numeric                     not null,
    amount   numeric                     not null,
    bc       integer                     null,
    bs       numeric                     null,
    ba       numeric                     null,
    sc       integer                     null,
    ss       numeric                     null,
    sa       numeric                     null,
    open     numeric                     not null,
    high     numeric                     not null,
    low      numeric                     not null,
    close    numeric                     not null,
    p_ch     numeric                     null,
    p_avg    numeric                     null,
    p_cp     numeric                     null,
    p_ap     numeric                     null
);

CREATE UNIQUE INDEX index_kline_1w_u_tes ON md.kline_1w (time, ex, symbol);

CREATE INDEX index_kline_1w_st ON md.kline_1w (time, symbol);
CREATE INDEX index_kline_1w_espcp ON md.kline_1w (ex, symbol, p_cp);
CREATE INDEX index_kline_1w_espap ON md.kline_1w (ex, symbol, p_ap);

SELECT create_hypertable('md.kline_1w', by_range('time'));

SELECT add_dimension('md.kline_1w', by_hash('symbol', 16));


-- 1o

create table md.kline_1o
(
    time     timestamp(6) with time zone not null,
    ex       varchar(32)                 not null,
    market   varchar(32)                 not null,
    symbol   varchar(32)                 not null,
    base     varchar(16)                 not null,
    quote    varchar(16)                 not null,
    interval varchar(4)                  not null,
    tds      integer                     not null,
    size     numeric                     not null,
    amount   numeric                     not null,
    bc       integer                     null,
    bs       numeric                     null,
    ba       numeric                     null,
    sc       integer                     null,
    ss       numeric                     null,
    sa       numeric                     null,
    open     numeric                     not null,
    high     numeric                     not null,
    low      numeric                     not null,
    close    numeric                     not null,
    p_ch     numeric                     null,
    p_avg    numeric                     null,
    p_cp     numeric                     null,
    p_ap     numeric                     null
);

CREATE UNIQUE INDEX index_kline_1o_u_tes ON md.kline_1o (time, ex, symbol);

CREATE INDEX index_kline_1o_st ON md.kline_1o (time, symbol);
CREATE INDEX index_kline_1o_espcp ON md.kline_1o (ex, symbol, p_cp);
CREATE INDEX index_kline_1o_espap ON md.kline_1o (ex, symbol, p_ap);

SELECT create_hypertable('md.kline_1o', by_range('time'));

SELECT add_dimension('md.kline_1o', by_hash('symbol', 16));
