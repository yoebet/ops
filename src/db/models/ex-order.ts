import { Column, Entity, Index, Unique } from 'typeorm';
import { ExSymbolBase } from '@/db/models/strategy/ex-symbol-base';
import { TradeSide } from '@/data-service/models/base';
import { ExTradeType } from '@/db/models/exchange-types';
import { NumericColumn } from '@/db/models/base-model';

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
  effective = 'effective',
  partialFilled = 'partialFilled',
  filled = 'filled',
  canceled = 'canceled',
  expired = 'expired',
  rejected = 'rejected',
}

export interface OrderIds {
  exOrderId?: string;
  exAlgoOrderId?: string;
  clientOrderId?: string;
  clientAlgoOrderId?: string;
}

export interface ExOrderResp extends OrderIds {
  status: OrderStatus;

  execPrice?: number;

  execSize?: number;

  execAmount?: number;

  exCreatedAt?: Date;

  exUpdatedAt?: Date;

  rawOrder?: any;

  rawAlgoOrder?: any;
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

  @Column({ nullable: true })
  algoStatus?: OrderStatus;

  @Index()
  @Column({ nullable: true })
  clientOrderId?: string;

  @Index()
  @Column({ nullable: true })
  clientAlgoOrderId?: string;

  @Column()
  priceType: 'market' | 'limit';

  @NumericColumn({ nullable: true })
  limitPrice?: number;

  @NumericColumn({ nullable: true })
  cancelPrice?: number;

  @NumericColumn({ nullable: true })
  baseSize?: number;

  @NumericColumn({ nullable: true })
  quoteAmount?: number;

  @Column({ nullable: true })
  reduceOnly?: boolean;

  @Column()
  algoOrder: boolean;

  @Column({ nullable: true })
  tpslType?: 'tp' | 'sl' | 'tpsl' | 'move';

  @NumericColumn({ nullable: true })
  tpTriggerPrice?: number;

  @NumericColumn({ nullable: true })
  tpOrderPrice?: number; // 委托价格为-1时，执行市价止盈

  @NumericColumn({ nullable: true })
  slTriggerPrice?: number;

  @NumericColumn({ nullable: true })
  slOrderPrice?: number; // 委托价格为-1时，执行市价止损

  @NumericColumn({ nullable: true })
  moveDrawbackPercent?: number;

  @NumericColumn({ nullable: true })
  moveActivePrice?: number;

  // ---

  @Column({ nullable: true })
  paperTrade?: boolean;

  @Index()
  @Column({ nullable: true })
  exOrderId?: string;

  @Index()
  @Column({ nullable: true })
  exAlgoOrderId?: string;

  @NumericColumn({ nullable: true })
  execPrice?: number;

  @NumericColumn({ nullable: true })
  execSize?: number;

  @NumericColumn({ nullable: true })
  execAmount?: number;

  @Column({ nullable: true })
  exCreatedAt?: Date;

  @Column({ nullable: true })
  exUpdatedAt?: Date;

  @Column({ nullable: true })
  exAlgoCreatedAt?: Date;

  @Column({ nullable: true })
  exAlgoUpdatedAt?: Date;

  @Column('jsonb', { select: false, nullable: true })
  rawOrderParams?: any;

  @Column('jsonb', { select: false, nullable: true })
  rawOrder?: any;

  @Column('jsonb', { select: false, nullable: true })
  rawAlgoOrder?: any;

  @Column({ nullable: true })
  memo?: string;

  @Column({ nullable: true })
  errMsg?: string;

  static orderFinished(status: OrderStatus): boolean {
    return ![
      OrderStatus.notSummited,
      OrderStatus.pending,
      OrderStatus.partialFilled,
    ].includes(status);
  }

  static orderFilled(status: OrderStatus): boolean {
    return status === OrderStatus.filled;
  }

  static orderToWait(status: OrderStatus): boolean {
    return [OrderStatus.pending, OrderStatus.partialFilled].includes(status);
  }

  static setProps(order: ExOrder, res: ExOrderResp): void {
    if (order === res) {
      return;
    }
    if (!res.exOrderId && !res.exAlgoOrderId) {
      throw new Error('no exOrderId/exAlgoOrderId');
    }
    if (res.exAlgoOrderId) {
      order.exAlgoOrderId = res.exAlgoOrderId;
    }
    if (!res.exOrderId) {
      order.algoStatus = res.status;
      order.rawAlgoOrder = res.rawAlgoOrder;
      if (res.exCreatedAt) {
        order.exAlgoCreatedAt = res.exCreatedAt;
      }
      if (res.exUpdatedAt) {
        order.exAlgoUpdatedAt = res.exUpdatedAt;
      }
    } else {
      order.status = res.status;
      order.exOrderId = res.exOrderId;
      // order.clientOrderId = res.clientOrderId;
      order.rawOrder = res.rawOrder;
      if (res.exCreatedAt) {
        order.exCreatedAt = res.exCreatedAt;
      }
      if (res.exUpdatedAt) {
        order.exUpdatedAt = res.exUpdatedAt;
      }
    }
    if (res.execPrice) {
      order.execPrice = res.execPrice;
    }
    if (res.execSize) {
      order.execSize = res.execSize;
    }
    if (res.execAmount) {
      order.execAmount = res.execAmount;
    }
  }
}
