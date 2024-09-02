create view tm.t_symbol_enabled as
select sc.*
from tm.t_symbol_config sc
where sc.deleted_at is null
  and sc.enabled = true
order by display_order;


create view tm.t_exchange_symbol_enabled as
select es.*
from tm.t_exchange_symbol es
         join tm.t_exchange_config ec on es.ex = ec.ex and ec.deleted_at is null and ec.enabled = true
         join tm.t_symbol_config sc on es.symbol = sc.symbol and sc.deleted_at is null and sc.enabled = true
where es.deleted_at is null
  and es.enabled = true
order by display_order;


create table tm.t_trade_abnormal
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
    create_time timestamp(6) with time zone default now()                               not null,
    status      varchar(32)                                                             not null,
    memo        varchar(256)                                                            null
);

