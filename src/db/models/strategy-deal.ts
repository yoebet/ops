import { Column, Entity, Index } from 'typeorm';
import { ExSymbolBase } from '@/db/models/ex-symbol-base';
import { ExTradeType } from '@/db/models/exchange-types';

@Entity()
export class StrategyDeal extends ExSymbolBase {
  @Column()
  @Index()
  strategyId: number;

  // @Column()
  // userId: number;

  @Column()
  @Index()
  userExAccountId: number;

  @Column()
  tradeType: ExTradeType;

  @Column('numeric', { nullable: true })
  pnlUsd?: number;

  @Column()
  status: 'open' | 'closed' | 'canceled';

  @Column('jsonb', { select: false, nullable: true })
  params?: any;

  @Column('jsonb', { select: false, nullable: true })
  execInfo?: any;
}
