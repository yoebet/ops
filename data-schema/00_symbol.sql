-- symbol_enabled

create view md.symbol_enabled as
select sc.*
from md.unified_symbol sc
where sc.deleted_at is null
  and sc.enabled = true;

-- ex_symbol_enabled

create view md.ex_symbol_enabled as
select es.*
from md.exchange_symbol es
         join md.exchange_config ec on es.ex = ec.ex and ec.deleted_at is null and ec.enabled = true
         join md.unified_symbol sc on es.symbol = sc.symbol and sc.deleted_at is null and sc.enabled = true
where es.deleted_at is null
  and es.enabled = true;
