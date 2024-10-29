export interface OFlowKline {
  ts: number;
  size: number; // 基础币种量
  amount: number; // 计价币种量
  open: number;
  high: number;
  low: number;
  close: number;
  // buySize
  bs: number; // 主动买
  // buyAmount
  ba: number;
  // sellSize
  ss: number; // 主动卖
  // sellAmount
  sa: number;
  // trades
  tds: number; // 交易笔数
}
