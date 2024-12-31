import { Column, Entity, Index, Unique } from 'typeorm';
import { ExSymbolBase } from '@/db/models/strategy/ex-symbol-base';
import { TradeSide } from '@/data-service/models/base';
import { ExTradeType } from '@/db/models/exchange-types';
import { AfterLoad } from 'typeorm/decorator/listeners/AfterLoad';

export enum OrderTag {
  open = 'open',
  close = 'close',
  stoploss = 'stoploss',
  forceclose = 'forceclose',
}

export enum OrderStatus {
  notSummited = 'notSummited',
  summitFailed = 'summitFailed',
  pending = 'pending',
  partialFilled = 'partialFilled',
  filled = 'filled',
  canceled = 'canceled',
  expired = 'expired',
  rejected = 'rejected',
}

export interface OrderIds {
  exOrderId?: string;
  clientOrderId?: string;
}

export interface ExOrderResp extends OrderIds {
  status: OrderStatus;

  execPrice?: number;

  execSize?: number;

  execAmount?: number;

  exCreatedAt?: Date;

  exUpdatedAt?: Date;

  rawOrder?: any;
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

  @Column({ nullable: true })
  tag?: OrderTag;

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
  cancelPrice?: number;

  @Column('numeric', { nullable: true })
  baseSize?: number;

  @Column('numeric', { nullable: true })
  quoteAmount?: number;

  @Column({ nullable: true })
  reduceOnly?: boolean;

  @Column()
  algoOrder: boolean;

  @Column({ nullable: true })
  tpslType?: 'tp' | 'sl' | 'tpsl' | 'move';

  @Column({ nullable: true })
  tpslClientOrderId?: string;

  @Column('numeric', { nullable: true })
  tpTriggerPrice?: number;

  @Column('numeric', { nullable: true })
  tpOrderPrice?: number; // 委托价格为-1时，执行市价止盈

  @Column('numeric', { nullable: true })
  slTriggerPrice?: number;

  @Column('numeric', { nullable: true })
  slOrderPrice?: number; // 委托价格为-1时，执行市价止损

  @Column('numeric', { nullable: true })
  moveDrawbackPercent?: number;

  @Column('numeric', { nullable: true })
  moveActivePrice?: number;

  // ---

  @Column({ nullable: true })
  paperTrade?: boolean;

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

  @Column({ nullable: true })
  memo?: string;

  @AfterLoad()
  onLoaded() {
    const numFields: (keyof ExOrder)[] = [
      'limitPrice',
      'baseSize',
      'quoteAmount',
      'tpTriggerPrice',
      'tpOrderPrice',
      'slTriggerPrice',
      'slOrderPrice',
      'moveDrawbackPercent',
      'moveActivePrice',
      'execPrice',
      'execSize',
      'execAmount',
    ];
    for (const key of numFields) {
      if (this[key] != null) {
        (this as any)[key] = +this[key];
      }
    }
  }

  static orderFinished(status: OrderStatus): boolean {
    return ![
      OrderStatus.notSummited,
      OrderStatus.pending,
      OrderStatus.partialFilled,
    ].includes(status);
  }

  static orderToWait(status: OrderStatus): boolean {
    return [OrderStatus.pending, OrderStatus.partialFilled].includes(status);
  }

  static setProps(order: ExOrder, res: ExOrderResp): void {
    order.exOrderId = res.exOrderId;
    order.status = res.status;
    order.execPrice = res.execPrice;
    order.execSize = res.execSize;
    order.execAmount = res.execAmount;
    if (res.exCreatedAt) {
      order.exCreatedAt = res.exCreatedAt;
    }
    if (res.exUpdatedAt) {
      order.exUpdatedAt = res.exUpdatedAt;
    }
    order.rawOrder = res.rawOrder;
  }
}
