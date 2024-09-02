export interface ByBitTradeTicker {
  T: number; //成交时间戳
  s: string; //symbol
  S: string; //方向 Side. Buy,Sell
  v: string; //成交数量
  p: string; //成交价格
  L: string; //Direction of price change. Unique field for future
  i: string; //交易ID
  BT: boolean; //Whether it is a block trade order or not
}
