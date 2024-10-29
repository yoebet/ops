// ws & rest
export interface TradeTicker {
  e: string; //事件 "trade"
  E: number; //事件时间戳
  s: string; //symbol
  t: string; //交易ID
  p: string; //成交价格
  q: string; //成交数量
  T: number; //成交时间戳
  m: boolean; //是否是买方
}

export type CandleRawDataBinance = [
  number, // 0开盘时间
  string, // 1开盘价
  string, // 2最高价
  string, // 3最低价
  string, // 4收盘价(当前K线未结束的即为最新价)
  string, // 5成交量
  number, // 6收盘时间
  string, // 7成交额(标的数量)
  number, // 8成交笔数
  string, // 9主动买入成交量
  string, // 10主动买入成交额(标的数量)
  string, // 11请忽略该参数
];

export interface WsCandleRawDataBinance {
  t: number; // 这根K线的起始时间
  T: number; // 这根K线的结束时间
  s: string; // 交易对
  i: string; // K线间隔
  f: number; // 这根K线期间第一笔成交ID
  L: number; // 这根K线期间末一笔成交ID
  o: string; // 这根K线期间第一笔成交价
  c: string; // 这根K线期间末一笔成交价
  h: string; // 这根K线期间最高成交价
  l: string; // 这根K线期间最低成交价
  v: string; // 这根K线期间成交量
  n: number; // 这根K线期间成交笔数
  x: boolean; // 这根K线是否完结(是否已经开始下一根K线)
  q: string; // 这根K线期间成交额
  V: string; // 主动买入的成交量
  Q: string; // 主动买入的成交额
  B: string; // 忽略此参数
}

export interface TradeRawDataBinance {
  id: number;
  price: string;
  qty: string;
  quoteQty: string;
  time: number;
  isBuyerMaker: boolean;
  isBestMatch?: boolean;
}
