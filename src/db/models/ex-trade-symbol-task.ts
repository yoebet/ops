import { Column, Entity, Index } from 'typeorm';
import { ExDataTask, TradeIdTime } from '@/db/models/ex-data-task';

@Entity()
@Index(['tradeTaskId', 'symbol'], { unique: true })
export class ExTradeSymbolTask extends ExDataTask {
  @Column()
  tradeTaskId: string;

  @Column()
  symbol: string;

  @Column('jsonb', { nullable: true })
  lastTrade?: TradeIdTime;

  @Column('jsonb', { nullable: true })
  resumeTrade?: TradeIdTime;

  @Column('jsonb', { nullable: true })
  patchFromTrade?: TradeIdTime;

  @Column('jsonb', { nullable: true })
  patchToTrade?: TradeIdTime;

  @Column({ default: 0 })
  fetchTimes: number = 0;
}
