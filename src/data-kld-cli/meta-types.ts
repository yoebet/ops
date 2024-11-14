export interface OFTimeLevel {
  interval: string;
  intervalSeconds: number;
}

export interface OFCoin {
  coin: string;
  name?: string;
}

export interface OFExchange {
  ex: string;
  name: string;
}

export interface OFUnifiedSymbol {
  symbol: string;
  market: string;
  base: string;
  quote: string;
  settle?: string;
}

export interface OFExchangeSymbol {
  ex: string;
  exAccount: string;
  symbol: string;
  rawSymbol: string;
}
