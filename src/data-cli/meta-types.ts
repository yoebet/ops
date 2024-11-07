export interface OFTimeLevel {
  interval: string;
  intervalSeconds: number;
}

export interface OFCoin {
  coin: string;
  name?: string;
}

export interface OFExchange {
  exCode: string; // or ex
  name: string;
}

export interface OFUnifiedSymbol {
  symbol: string;
  exMarket: string; // or market
  base: string;
  quote: string;
  settle?: string;
}

export interface OFExchangeSymbol {
  exCode: string; // or ex
  exAccountCode: string; // or exAccount
  symbol: string;
  rawSymbol: string;
}
