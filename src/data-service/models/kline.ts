import { ES } from '@/data-service/models/base';

export interface FtKline {
  ts: number;
  size: number;
  amount: number;
  open: number;
  high: number;
  low: number;
  close: number;
  bs?: number;
  ba?: number;
  ss?: number;
  sa?: number;
  tds?: number;
}

export interface Kline extends Omit<FtKline, 'ts'>, ES {
  time: Date;
  market: string;
  interval: string;
  base: string;
  quote: string;
  p_ch?: number;
  p_avg?: number;
  p_cp?: number;
  p_ap?: number;
}

export declare type Kline2 = FtKline & Kline;
