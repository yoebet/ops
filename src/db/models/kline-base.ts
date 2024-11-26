import { Kline } from '@/data-service/models/kline';
import { Entity, Index } from 'typeorm';

// @Entity('md-kline')
export class KlineBase implements Kline {
  time: Date;
  ex: string;
  symbol: string;
  market: string;
  interval: string;
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
  base: string;
  quote: string;
  p_ch?: number;
  p_avg?: number;
  p_cp?: number;
  p_ap?: number;
}
