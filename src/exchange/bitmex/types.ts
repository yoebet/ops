export interface TradeTickerBitMEX {
  foreignNotional?: number;
  grossValue?: number;
  homeNotional?: number;
  price: number;
  side: string;
  size: number;
  symbol: string;
  tickDirection?: string;
  timestamp: string;
  trdMatchID: string;
  trdType?: string;
}
