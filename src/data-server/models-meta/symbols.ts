export interface OflUnifiedSymbol {
  symbol: string; // unified

  market: string;

  base: string;

  quote: string;

  settle?: string;
}

export interface OflExchangeSymbol {
  ex: string;

  market: string;

  symbol: string;

  rawSymbol: string;

  unifiedConfig?: OflUnifiedSymbol;
}
