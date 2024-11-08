import { ExAccountCode, ExKline, ExTrade } from '@/exchange/exchanges-types';
import { ExRest } from '@/exchange/base/rest/ex-rest';

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

export interface FetchTradeParams {
  symbol: string;
  limit?: number;
}

export interface ExchangeService {
  getKlines(params: FetchKlineParams): Promise<ExKline[]>;

  getTrades(params: FetchTradeParams): Promise<ExTrade[]>;

  getSymbolInfo(symbol: string): Promise<any>;

  getPrice(symbol: string): Promise<any>;
}

export type CapableRest = ExRest & ExchangeService;
