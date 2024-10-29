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

export interface HistoryTradeParams {
  symbol: string;
  fromId?: string;
  toId?: string;
  limit?: number;
}

export interface HistoryKlinesByMonthParams extends BaseKlineParams {
  yearMonth: string; // yyyy-mm
}

export interface HistoryKlinesByDayParams extends BaseKlineParams {
  date: string; // yyyy-mm-dd
}

export interface ExchangeService {
  getKlines(params: FetchKlineParams): Promise<ExKline[]>;

  getTrades(params: FetchTradeParams): Promise<ExTrade[]>;

  getHistoryTrades(params: HistoryTradeParams): Promise<ExTrade[]>;

  loadHistoryKlinesOneMonth(
    params: HistoryKlinesByMonthParams,
  ): Promise<ExKline[]>;

  loadHistoryKlinesOneDay(params: HistoryKlinesByDayParams): Promise<ExKline[]>;
}

export type CapableRest = ExRest & ExchangeService;
