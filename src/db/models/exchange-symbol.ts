import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseModel } from '@/db/models/base-model';
import { ExchangeCode, ExMarket } from '@/db/models/exchange-types';
import { UnifiedSymbol } from '@/db/models/unified-symbol';

@Entity()
@Index(['ex', 'symbol'], { unique: true })
@Index(['ex', 'market', 'rawSymbol'], { unique: true })
export class ExchangeSymbol extends BaseModel {
  @Column()
  ex: ExchangeCode;

  @Column({ default: ExMarket.spot })
  market: ExMarket = ExMarket.spot;

  @Column()
  symbol: string;

  @Column()
  rawSymbol: string;

  @ManyToOne(() => UnifiedSymbol, { cascade: false, nullable: true })
  @JoinColumn({ name: 'symbol', referencedColumnName: 'symbol' })
  unifiedSymbol?: UnifiedSymbol;

  // okx: minSz
  // binance: PRICE_FILTER.tickSize
  // @Column({ nullable: true })
  // priceTick?: string;

  @Column('smallint', { nullable: true })
  priceDigits?: number;

  // okx: lotSz
  // binance: LOT_SIZE/MARKET_LOT_SIZE.stepSize
  // @Column({ nullable: true })
  // baseSizeStep?: string;

  @Column('smallint', { nullable: true })
  baseSizeDigits?: number;

  @Column('jsonb', { select: false, nullable: true })
  exchangeInfo?: any;
}
