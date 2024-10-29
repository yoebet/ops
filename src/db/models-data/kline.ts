import { ES } from '@/db/models-data/base';

export interface Kline extends ES {
  time: Date;
  market: string;
  interval: string;
  base: string;
  quote: string;
  open: number;
  high: number;
  low: number;
  close: number;
  tds: number;
  size: number;
  amount: number;
  bc?: number;
  bs?: number;
  ba?: number;
  sc?: number;
  ss?: number;
  sa?: number;
  p_ch?: number;
  p_avg?: number;
  p_cp?: number;
  p_ap?: number;
}
