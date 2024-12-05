import { BaseModel } from '@/db/models/base-model';
import { Column, Entity, Index } from 'typeorm';
import { ExTradeType } from '@/db/models/exchange-types';
import {
  ConsiderSide,
  OppCheckerAlgo,
  StrategyAlgo,
} from '@/strategy/strategy.types';

@Entity()
export class StrategyTemplate extends BaseModel {
  // userId

  @Column()
  name: string;

  @Column()
  code: StrategyAlgo;

  @Column({ nullable: true })
  openAlgo?: OppCheckerAlgo;

  @Column({ nullable: true })
  closeAlgo?: OppCheckerAlgo;

  @Column({ nullable: true })
  openDealSide?: ConsiderSide;

  @Column({ nullable: true })
  tradeType?: ExTradeType;

  @Column('numeric', { nullable: true })
  quoteAmount?: number;

  @Column('jsonb', { nullable: true })
  params?: any;
}
