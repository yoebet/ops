import { BaseModel, NumericColumn } from '@/db/models/base-model';
import { Column, Entity } from 'typeorm';
import { ExTradeType } from '@/db/models/exchange-types';
import {
  ConsiderSide,
  OppCheckerAlgo,
  StrategyAlgo,
} from '@/strategy/strategy.types';

@Entity()
export class StrategyTemplate extends BaseModel {
  // userId

  static listFields: (keyof StrategyTemplate)[] = [
    'id',
    'createdAt',
    'name',
    'code',
    'openAlgo',
    'closeAlgo',
    'openDealSide',
    'tradeType',
    'quoteAmount',
    'memo',
  ];

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

  @NumericColumn({ nullable: true })
  quoteAmount?: number;

  @Column('jsonb', { nullable: true })
  params?: any;

  @Column({ nullable: true })
  memo?: string;
}
