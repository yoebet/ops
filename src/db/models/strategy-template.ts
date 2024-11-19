import { BaseModel } from '@/db/models/base-model';
import { Column, Entity, Index } from 'typeorm';
import { ExTradeType } from '@/db/models/exchange-types';

@Entity()
export class StrategyTemplate extends BaseModel {
  @Column()
  @Index({ unique: true })
  name: string;

  @Column()
  @Index({ unique: true })
  code: string;

  @Column({ nullable: true })
  tradeType?: ExTradeType;

  @Column('jsonb', { nullable: true })
  params?: any;
}
