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
