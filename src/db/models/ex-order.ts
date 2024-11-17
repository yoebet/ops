import { Column, Entity, Index, Unique } from 'typeorm';
import { ExSymbolBase } from '@/db/models/ex-symbol-base';
import { TradeSide } from '@/data-service/models/base';
import { ExTradeType } from '@/db/models/exchange-types';

export enum OrderStatus {
  notSummited = 'notSummited',
  pending = 'pending',
  partialFilled = 'partialFilled',
  filled = 'filled',
  canceled = 'canceled',
  expired = 'expired',
  rejected = 'rejected',
}

export interface ExOrderResp {
  exOrderId?: string;

  clientOrderId?: string;

  status: OrderStatus;

  execPrice?: number;

  execSize?: number;

  execAmount?: number;

  exCreatedAt?: Date;

  exUpdatedAt?: Date;
}

@Entity()
@Unique(['ex', 'exOrderId'])
@Unique(['ex', 'clientOrderId'])
export class ExOrder extends ExSymbolBase implements ExOrderResp {
  // @Column()
  // userId: number;

  @Column()
  @Index()
  userExAccountId: number;

  @Column({ nullable: true })
  @Index()
  strategyId?: number;

  @Column({ nullable: true })
  @Index()
  dealId?: number;

  @Column()
  side: TradeSide;

  @Column({ nullable: true })
  tradeType?: ExTradeType;

  // gtc
  // fok：全部成交或立即取消
  // ioc：立即成交并取消剩余
  @Column({ nullable: true })
  timeType?: 'gtc' | 'fok' | 'ioc';

  @Column()
  status: OrderStatus;

  @Index()
  @Column({ nullable: true })
  clientOrderId?: string;

  @Column()
  priceType: 'market' | 'limit';

  @Column('numeric', { nullable: true })
  limitPrice?: number;

  @Column('numeric', { nullable: true })
  baseSize?: number;

  @Column('numeric', { nullable: true })
  quoteAmount?: number;

  @Column({ nullable: true })
  reduceOnly?: boolean;

  @Column()
  algoOrder: boolean;

  @Column({ nullable: true })
  algoType?: 'tp' | 'sl' | 'tpsl' | 'move';

  @Column('numeric', { nullable: true })
  tpTriggerPrice?: number;

  @Column('numeric', { nullable: true })
  tpOrderPrice?: number; // 委托价格为-1时，执行市价止盈

  @Column('numeric', { nullable: true })
  slTriggerPrice?: number;

  @Column('numeric', { nullable: true })
  slOrderPrice?: number; // 委托价格为-1时，执行市价止损

  @Column('numeric', { nullable: true })
  moveDrawbackRatio?: number;

  @Column('numeric', { nullable: true })
  moveActivePrice?: number;

  // ---

  @Index()
  @Column({ nullable: true })
  exOrderId?: string;

  @Column('numeric', { nullable: true })
  execPrice?: number;

  @Column('numeric', { nullable: true })
  execSize?: number;

  @Column('numeric', { nullable: true })
  execAmount?: number;

  @Column({ nullable: true })
  exCreatedAt?: Date;

  @Column({ nullable: true })
  exUpdatedAt?: Date;

  @Column('jsonb', { select: false, nullable: true })
  rawOrderParams?: any;

  @Column('jsonb', { select: false, nullable: true })
  rawOrder?: any;

  static OrderFinished(order: ExOrder): boolean {
    return ![
      OrderStatus.notSummited,
      OrderStatus.pending,
      OrderStatus.partialFilled,
    ].includes(order.status);
  }
}
