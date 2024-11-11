import { Column, Entity } from 'typeorm';
import { ExSymbolBase } from '@/db/models/ex-symbol-base';
import { TradeSide } from '@/data-service/models/base';

// @Entity()
export class ExOrder extends ExSymbolBase {
  @Column()
  side: TradeSide;

  @Column()
  margin: boolean;

  @Column()
  algoOrder: boolean;

  @Column()
  marginMode: 'isolated' | 'cross';

  @Column()
  priceType: 'market' | 'limit';

  // gtc
  // fok：全部成交或立即取消
  // ioc：立即成交并取消剩余
  @Column({ nullable: true })
  timeType?: 'gtc' | 'fok' | 'ioc';

  @Column()
  status: 'pending' | 'partial-filled' | 'filled' | 'canceled';

  @Column({ nullable: true })
  exOrderId?: string;

  @Column({ nullable: true })
  clientOrderId?: string;

  // ---

  @Column({ nullable: true })
  price?: number;

  @Column({ nullable: true })
  baseSize?: number;

  @Column({ nullable: true })
  quoteAmount?: number;

  @Column({ nullable: true })
  reduceOnly?: boolean;

  // @Column({ nullable: true })
  // positionId?: string;

  // @Column({ nullable: true })
  // strategyId?: string;

  // @Column('jsonb', { nullable: true })
  // strategyParams?: any;

  algoType?: 'tp' | 'sl' | 'tpsl' | 'move';

  @Column({ nullable: true })
  tpTriggerPrice?: string;

  @Column({ nullable: true })
  tpOrderPrice?: string; // 委托价格为-1时，执行市价止盈

  @Column({ nullable: true })
  slTriggerPrice?: string;

  @Column({ nullable: true })
  slOrderPrice?: string; // 委托价格为-1时，执行市价止损

  @Column({ nullable: true })
  moveDrawbackRatio?: string;

  @Column({ nullable: true })
  moveActivePrice?: string;

  // ---

  @Column({ nullable: true })
  execAvgPrice?: number;

  @Column({ nullable: true })
  execSize?: number;

  @Column({ nullable: true })
  execAmount?: number;

  @Column({ nullable: true })
  allFilledAt?: Date;

  @Column({ nullable: true })
  exCreatedAt?: Date;

  @Column({ nullable: true })
  exUpdatedAt?: Date;

  @Column({ nullable: true })
  exClosedAt?: Date;

  @Column('jsonb', { select: false, nullable: true })
  raw?: any;
}
