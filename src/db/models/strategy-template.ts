import { BaseModel } from '@/db/models/base-model';
import { Column, Entity, Index } from 'typeorm';
import { ExTradeType } from '@/db/models/exchange-types';
import { StrategyAlgo } from '@/trade-strategy/strategy.types';

@Entity()
export class StrategyTemplate extends BaseModel {
  // userId

  @Column()
  name: string;

  @Column()
  @Index()
  code: StrategyAlgo;

  @Column({ nullable: true })
  tradeType?: ExTradeType;

  @Column('numeric', { nullable: true })
  quoteAmount?: number;

  @Column('jsonb', { nullable: true })
  params?: any;
}
