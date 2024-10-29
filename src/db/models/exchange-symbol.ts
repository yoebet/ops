import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseModel } from '@/db/models/base-model';
import {
  ExAccountCode,
  ExchangeCode,
  ExMarket,
} from '@/exchange/exchanges-types';
import { UnifiedSymbol } from '@/db/models/unified-symbol';
import { Exclude } from 'class-transformer';

@Entity()
@Index(['ex', 'symbol'], { unique: true })
@Index(['exAccount', 'symbol'], { unique: true })
@Index(['ex', 'market', 'rawSymbol'], { unique: true })
export class ExchangeSymbol extends BaseModel {
  @Column()
  ex: ExchangeCode;

  @Column()
  exAccount: ExAccountCode;

  @Column({ default: ExMarket.spot })
  market: ExMarket = ExMarket.spot;

  @Column()
  symbol: string;

  @Column({ comment: '交易所 symbol' })
  rawSymbol: string;

  @Exclude()
  @Column({ type: 'bool', default: true })
  enabled = true;

  @ManyToOne(() => UnifiedSymbol, { cascade: false, nullable: true })
  @JoinColumn({ name: 'symbol', referencedColumnName: 'symbol' })
  unifiedSymbol?: UnifiedSymbol;

  @Column({ nullable: true })
  contractSizeStr?: string;

  @Column({ nullable: true })
  dataDateFrom?: string; // 2020-01-01

  @Column()
  dataIntervalFrom: string = '15m';

  @Column('jsonb', { nullable: true })
  params?: any;
}
