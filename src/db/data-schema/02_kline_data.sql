-- 1m

update md.kline_1m
set p_ch=close - open,
    p_avg=case when size = 0 then 0 else amount / size end,
    p_cp=case when open = 0 then 0 else (close - open) / open * 100 end,
    p_ap=case when low = 0 then 0 else abs(high - low) / low * 100 end;


-- 5m

update md.kline_5m
set p_ch=close - open,
    p_avg=case when size = 0 then 0 else amount / size end,
    p_cp=case when open = 0 then 0 else (close - open) / open * 100 end,
    p_ap=case when low = 0 then 0 else abs(high - low) / low * 100 end;


-- 15m

update md.kline_15m
set p_ch=close - open,
    p_avg=case when size = 0 then 0 else amount / size end,
    p_cp=case when open = 0 then 0 else (close - open) / open * 100 end,
    p_ap=case when low = 0 then 0 else abs(high - low) / low * 100 end;


-- 1h

update md.kline_1h
set p_ch=close - open,
    p_avg=case when size = 0 then 0 else amount / size end,
    p_cp=case when open = 0 then 0 else (close - open) / open * 100 end,
    p_ap=case when low = 0 then 0 else abs(high - low) / low * 100 end;


-- 4h

update md.kline_4h
set p_ch=close - open,
    p_avg=case when size = 0 then 0 else amount / size end,
    p_cp=case when open = 0 then 0 else (close - open) / open * 100 end,
    p_ap=case when low = 0 then 0 else abs(high - low) / low * 100 end;


-- 1d

update md.kline_1d
set p_ch=close - open,
    p_avg=case when size = 0 then 0 else amount / size end,
    p_cp=case when open = 0 then 0 else (close - open) / open * 100 end,
    p_ap=case when low = 0 then 0 else abs(high - low) / low * 100 end;


-- 1w

update md.kline_1w
set p_ch=close - open,
    p_avg=case when size = 0 then 0 else amount / size end,
    p_cp=case when open = 0 then 0 else (close - open) / open * 100 end,
    p_ap=case when low = 0 then 0 else abs(high - low) / low * 100 end;


-- 1o

update md.kline_1o
set p_ch=close - open,
    p_avg=case when size = 0 then 0 else amount / size end,
    p_cp=case when open = 0 then 0 else (close - open) / open * 100 end,
    p_ap=case when low = 0 then 0 else abs(high - low) / low * 100 end;
