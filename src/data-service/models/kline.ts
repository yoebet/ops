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
