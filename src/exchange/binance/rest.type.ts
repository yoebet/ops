export interface CandleRawDataBinance {
  [index: number]: [
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

export interface TradeRawDataBinanceCoinM {
  id: number;
  price: string;
  qty: string;
  baseQty: string;
  time: number;
  isBuyerMaker: boolean;
}

export const apiKeyBinance =
  'lEabzcpH8IlwSKpWFu9cUvgfZN8y8dObKVQav50AHGVoRDA26uD25BGAgMZEN7GG';

export const secretKeyBinance =
  '48e8QpgOnELJSS9C1VFGEq8U9dQQcyWhL9DMwyiGTAH9jiqbcPUVJUKnvC4SAELX';
