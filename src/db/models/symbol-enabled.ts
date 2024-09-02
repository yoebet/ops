import { BaseModel } from '@/db/models/base-model';
import { Column, Entity } from 'typeorm';
import { ExMarket } from '@/exchange/exchanges-types';
import { Exclude } from 'class-transformer';

@Entity({ synchronize: false })
export class SymbolEnabled extends BaseModel {
  @Column()
  symbol: string; // unified

  @Column()
  market: ExMarket;

  @Column()
  base: string;

  @Column()
  quote: string;

  @Column({ nullable: true })
  settle?: string;

  @Column({ comment: '价格精度' })
  priceTickStr: string;

  // @Column({ type: 'bool', default: true })
  // enabled = true;

  // @Column({ default: 0 })
  // displayOrder: number;

  @Exclude()
  @Column({ default: true })
  visibleToClient: boolean;

  @Column({ type: 'decimal', default: 1 })
  sizeTicker: number;

  @Column({ type: 'decimal', default: 1 })
  amountTicker: number;
}
