import { Column, Entity, Index } from 'typeorm';
import { ExSymbolBase } from '@/db/models/strategy/ex-symbol-base';
import { ExTradeType } from '@/db/models/exchange-types';
import { ExOrder } from '@/db/models/ex-order';
import { Strategy } from '@/db/models/strategy/strategy';
import { NumericColumn } from '@/db/models/base-model';
import { TradeSide } from '@/data-service/models/base';

@Entity()
export class StrategyDeal extends ExSymbolBase {
  static listFields: (keyof StrategyDeal)[] = [
    'id',
    'pendingOrderId',
    'lastOrderId',
    'lastOrderSide',
    'pnlUsd',
    'status',
    'openAt',
    'closedAt',
    'dealDuration',
    'closeReason',
    'ordersCount',
    'createdAt',
  ];

  @Column()
  @Index()
  strategyId: number;

  // @Column()
  // userId: number;

  @Column()
  @Index()
  userExAccountId: number;

  @Column()
  tradeType: ExTradeType;

  @Column({ nullable: true })
  pendingOrderId?: number;

  @Column({ nullable: true })
  lastOrderId?: number;

  @Column({ nullable: true })
  lastOrderSide?: TradeSide;

  @NumericColumn({ nullable: true })
  pnlUsd?: number;

  @Column()
  status: 'open' | 'closed' | 'canceled';

  @Column({ nullable: true })
  paperTrade?: boolean;

  @Column({ nullable: true })
  openAt?: Date;

  @Column({ nullable: true })
  closedAt?: Date;

  @Column({ nullable: true })
  dealDuration?: string;

  @Column({ nullable: true })
  closeReason?: string;

  @Column({ nullable: true })
  ordersCount?: number;

  pendingOrder?: ExOrder;
  lastOrder?: ExOrder;

  static setLastOrder(deal: StrategyDeal, order: ExOrder) {
    if (order) {
      deal.lastOrder = order;
      deal.lastOrderId = order.id;
      deal.lastOrderSide = order.side;
    } else {
      deal.lastOrder = null;
      deal.lastOrderId = null;
      deal.lastOrderSide = null;
    }
  }

  static setPendingOrder(deal: StrategyDeal, pendingOrder: ExOrder) {
    if (pendingOrder) {
      deal.pendingOrder = pendingOrder;
      deal.pendingOrderId = pendingOrder.id;
    } else {
      deal.pendingOrder = null;
      deal.pendingOrderId = null;
    }
  }

  static newStrategyDeal(strategy: Strategy): StrategyDeal {
    const deal = new StrategyDeal();
    deal.ex = strategy.ex;
    deal.market = strategy.market;
    deal.baseCoin = strategy.baseCoin;
    deal.symbol = strategy.symbol;
    deal.rawSymbol = strategy.rawSymbol;
    deal.strategyId = strategy.id;
    deal.userExAccountId = strategy.userExAccountId;
    deal.tradeType = strategy.tradeType;
    deal.paperTrade = strategy.paperTrade;
    deal.status = 'open';
    return deal;
  }
}
