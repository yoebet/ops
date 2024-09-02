import { Candle, ExSymbol, TradeAgg } from '@/db/models-data/base';

export interface Kline extends ExSymbol, TradeAgg, Candle {
  time: Date;
  interval: string;
}
