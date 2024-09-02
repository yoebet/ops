import { Candle, TradeSide } from '@/db/models-data/base';

export interface OFlowTicker {
  ts: number;
  size: number;
  amount: number;
  price: number;
  tradeId: string;
  side: TradeSide;
}

export interface Kline0 extends Candle {
  ts: number;
  size: number; // 基础币种量
  amount: number; // 计价币种量
}

export interface Footprint0 {
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

export interface Footprint1 extends Footprint0 {
  // priceRollupLevel
  prl: number; // tick倍数 1/2/4/8/...
  // priceLower
  pl: number; // 价格区间下界，含
  // priceUpper
  pu: number; // 不含
}
