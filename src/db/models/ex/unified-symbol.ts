import { BaseModel } from '@/db/models/base-model';
import { Column, Entity, Index } from 'typeorm';
import { ExMarket } from '@/db/models/exchange-types';

@Entity()
@Index(['symbol'], { unique: true })
export class UnifiedSymbol extends BaseModel {
  @Column()
  symbol: string;

  @Column()
  market: ExMarket;

  @Column()
  base: string;

  @Column()
  quote: string;

  @Column({ nullable: true })
  settle?: string;
}
