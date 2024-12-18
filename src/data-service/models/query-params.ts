import { ES } from '@/data-service/models/base';

export interface KlineParams extends ES {
  tsFrom?: number;
  tsTo?: number;
  interval: string;
  limit?: number;
}

export interface KlineParams2 extends KlineParams {
  dateFrom?: string; // yyyy-MM-dd or yyyy-MM-dd HH:mm
  dateTo?: string;
  resultTimeField?: 'ts' | 'time';
}

export interface MultiSymbolsKlineParams {
  tsFrom?: number;
  tsTo?: number;
  interval: string;
  limit?: number;
  symbols: ES[];
  zipSymbols?: boolean;
}
