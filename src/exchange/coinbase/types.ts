export interface SubscribeTradeRequest {
  type: string;
  product_ids: string[];
  channel: string;
  api_key: string;
  timestamp: string;
  signature: string;
}

export interface CoinbaseTradeEvent {
  type: string;
  trades: CoinbaseTradeTicker[];
}

export interface CoinbaseTradeTicker {
  price: string;
  product_id: string;
  side: 'BUY' | 'SELL';
  size: string;
  time: string; //"2023-02-17T06:34:04.699074Z",
  trade_id: string;
}
