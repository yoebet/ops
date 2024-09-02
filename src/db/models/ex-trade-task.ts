import { Column, Entity, Index } from 'typeorm';
import { ExDataTask, TradeIdTimeSymbol } from '@/db/models/ex-data-task';

@Entity()
@Index(['exAccount', 'key'], { unique: true })
export class ExTradeTask extends ExDataTask {
  @Column()
  key: string;

  @Column('text', { nullable: true, array: true })
  symbols?: string[];

  @Column('jsonb', { nullable: true })
  lastTrade?: TradeIdTimeSymbol;

  @Column('jsonb', { nullable: true })
  resumeTrade?: TradeIdTimeSymbol;
}
