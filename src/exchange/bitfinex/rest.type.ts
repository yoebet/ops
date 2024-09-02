export interface TradeRawDataBitfinex {
  instId: string;
  tradeId: string;
  px: string; //Trade price
  sz: string; //Trade quantity
  side: string; //Trade side buy||sell
  ts: string; //Trade time, Unix timestamp format in milliseconds, e.g. 1597026383085
}
