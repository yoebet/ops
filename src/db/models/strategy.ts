import { Column, Entity, Index, Unique } from 'typeorm';
import { ExSymbolBase } from '@/db/models/ex-symbol-base';
import { ExTradeType } from '@/db/models/exchange-types';

@Entity()
@Unique(['templateId', 'userExAccountId', 'tradeType', 'symbol'])
export class Strategy extends ExSymbolBase {
  @Column()
  @Index()
  templateId: number;

  @Column()
  name: string;

  // @Column()
  // userId: number;

  @Column()
  @Index()
  userExAccountId: number;

  @Column()
  tradeType: ExTradeType;

  @Column({ nullable: true })
  currentDealId?: number;

  @Column({ nullable: true })
  lastDealId?: number;

  @Column()
  active: boolean;

  @Column('numeric', { nullable: true })
  accumulatedPnlUsd?: number;

  @Column('jsonb', { select: false, nullable: true })
  params?: any;

  @Column('jsonb', { select: false, nullable: true })
  execInfo?: any;
}
