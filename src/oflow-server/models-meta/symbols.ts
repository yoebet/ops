export interface OflUnifiedSymbol {
  symbol: string; // unified

  exMarket: string;

  base: string;

  quote: string;

  settle?: string;

  priceTickStr: string;

  sizeTicker: number;

  amountTicker: number;
}

export interface OflExchangeSymbol {
  exCode: string;

  exAccountCode: string;

  symbol: string;

  rawSymbol: string;

  priceTickStr: string;

  symbolConfig?: OflUnifiedSymbol;
}
