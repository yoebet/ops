import { ExAccountCode, ExchangeCode } from '@/db/models/exchange-types';
import { ExRest } from '@/exchange/base/rest/ex-rest';
import { FtKline } from '@/data-service/models/kline';
import { TradeSide } from '@/data-service/models/base';

export interface BaseKlineParams {
  exAccount?: ExAccountCode;
  symbol: string;
  interval: string;
}

export interface FetchKlineParams extends BaseKlineParams {
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface ExPrice {
  last?: number;
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

export declare type ExchangeService = ExRest;
