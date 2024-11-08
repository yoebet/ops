import { TradeSide } from '@/db/models-data/base';
import { FtKline } from '@/data-service/models/klines';

export enum ExchangeCode {
  binance = 'binance',
  okx = 'okx',
}

export enum ExAccountCode {
  okxUnified = 'okx-unified',
  binanceSpot = 'binance-spot',
  binanceUm = 'binance-usd-m',
  binanceCm = 'binance-coin-m',
}

export enum ExMarket {
  spot = 'spot', //现货
  perp = 'perp', //正向永续
  perp_inv = 'perp_inv', //反向永续
}

export interface ExTrade {
  ex: ExchangeCode;
  exAccount: ExAccountCode;
  rawSymbol: string; //交易所内的symbol
  tradeId: string;
  price: number;
  size: number; //反向交易对 这里填U金额
  amount?: number;
  side: TradeSide;
  ts: number; // ms
}

export type ExKline = FtKline;

export interface ExKlineWithSymbol extends ExKline {
  rawSymbol: string;
  live?: boolean;
}
