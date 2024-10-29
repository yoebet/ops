import { TradeSide } from '@/db/models-data/base';

export interface TradeTicker {
  instId: string;
  tradeId: string;
  px: string;
  sz: string;
  side: TradeSide;
  ts: string; // ms
}

export interface RestBody<T> {
  code: string;
  msg: string;
  data: T;
}

export type CandleRawDataOkx = [
  string, // 0开盘时间
  string, // 1开盘价
  string, // 2最高价
  string, // 3最低价
  string, // 4收盘价(当前K线未结束的即为最新价)
  string, // 5交易量，以张为单位 如果是衍生品合约，数值为合约的张数。如果是币币/币币杠杆，数值为交易货币的数量。
  string, // 6交易量，以币为单位 如果是衍生品合约，数值为交易货币的数量。如果是币币/币币杠杆，数值为计价货币的数量。
  string, // 7交易量，以计价货币为单位 如：BTC-USDT 和 BTC-USDT-SWAP, 单位均是 USDT；BTC-USD-SWAP 单位是 USD
  string, // 8 K线状态 0 代表 K 线未完结，1 代表 K 线已完结。
];

export interface TradeRawDataOkx {
  instId: string;
  tradeId: string;
  px: string; //Trade price
  sz: string; //Trade quantity
  side: string; //Trade side buy||sell
  ts: string; //Trade time, Unix timestamp format in milliseconds, e.g. 1597026383085
}
