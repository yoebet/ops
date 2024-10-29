import { BaseModel } from '@/db/models/base-model';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import {
  ExAccountCode,
  ExchangeCode,
  ExMarket,
} from '@/exchange/exchanges-types';
import { UnifiedSymbol } from '@/db/models/unified-symbol';

export enum DataTaskStatus {
  completed = 'completed',
  canceled = 'canceled',
  aborted = 'aborted',
  pending = 'pending',
  running = 'running',
}

export type DateRange = [startDate?: string, endDate?: string];

@Entity()
@Index(['ex', 'symbol', 'interval', 'startDate', 'endDate'], { unique: true })
export class ExSymbolDataTask extends BaseModel {
  @Column()
  ex: ExchangeCode;

  @Column()
  exAccount: ExAccountCode;

  @Column()
  market: ExMarket;

  @Column()
  symbol: string;

  @Column()
  rawSymbol: string;

  @ManyToOne(() => UnifiedSymbol, { cascade: false, nullable: true })
  @JoinColumn({ name: 'symbol', referencedColumnName: 'symbol' })
  unifiedSymbol: UnifiedSymbol;

  @Column()
  interval: string;

  @Column()
  taskType: string = 'load';

  @Column()
  dataType: string = 'kline';

  @Column('jsonb', { nullable: true })
  params?: any;

  // 2024-10-30
  @Column({ nullable: true })
  startDate?: string;

  @Column({ nullable: true })
  endDate?: string;

  @Column({ nullable: true })
  lastDate?: string;

  @Column({ default: DataTaskStatus.pending })
  status: DataTaskStatus = DataTaskStatus.pending;

  @Column({ nullable: true })
  completedAt?: Date;
}
