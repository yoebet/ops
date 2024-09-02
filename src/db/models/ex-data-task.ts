import { BaseModel } from '@/db/models/base-model';
import { Column } from 'typeorm';
import { ExAccountCode, ExchangeCode } from '@/exchange/exchanges-types';

export interface TradeIdTime {
  tradeId: string;
  tradeTs: number;
}

export interface TradeIdTimeSymbol extends TradeIdTime {
  symbol: string;
}

export enum DataTaskStatus {
  completed = 'completed',
  failed = 'failed',
  canceled = 'canceled',
  pending = 'pending',
  running = 'running',
}

export abstract class ExDataTask extends BaseModel {
  @Column()
  ex: ExchangeCode;
  @Column()
  exAccount: ExAccountCode;

  @Column({ default: 0 })
  patchedCount: number = 0;

  @Column({ default: DataTaskStatus.pending })
  status: DataTaskStatus = DataTaskStatus.pending;

  @Column({ nullable: true })
  errMsg?: string;

  @Column({ nullable: true })
  startedAt?: Date;

  @Column({ nullable: true })
  finishedAt?: Date;

  static dataTaskFinished(s: DataTaskStatus) {
    return [
      DataTaskStatus.completed,
      DataTaskStatus.failed,
      DataTaskStatus.canceled,
    ].includes(s);
  }
}
