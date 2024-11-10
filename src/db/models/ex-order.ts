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
  marginMode: 'isolated' | 'cross';

  // market：市价单
  // limit：限价单
  @Column()
  priceType: string;

  // gtc
  // fok：全部成交或立即取消
  // ioc：立即成交并取消剩余
  @Column({ nullable: true })
  timeType?: string;

  // open, partial-filled, filled, canceled
  @Column()
  status: string;

  @Column({ nullable: true })
  exOrderId?: string;

  @Column({ nullable: true })
  clientOrderId?: string;

  @Column({ nullable: true })
  positionId?: string;

  // ---

  @Column({ nullable: true })
  limitPrice?: number;

  @Column({ nullable: true })
  reqSize?: number;

  @Column({ nullable: true })
  quoteAmount?: number;

  @Column({ nullable: true })
  posId?: string;

  @Column({ nullable: true })
  strategyId?: string;

  @Column('jsonb', { nullable: true })
  strategyParams?: any;

  // ---

  @Column({ nullable: true })
  execAvgPrice?: number;

  @Column({ nullable: true })
  execSize?: number;

  @Column({ nullable: true })
  execAmount?: number;

  @Column({ nullable: true })
  filledAt?: Date;

  @Column({ nullable: true })
  exCreatedAt?: Date;

  @Column({ nullable: true })
  exUpdatedAt?: Date;

  @Column({ nullable: true })
  exClosedAt?: Date;

  @Column('jsonb', { nullable: true })
  raw?: any;
}
