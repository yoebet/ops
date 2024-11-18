import { Column, Entity, Index } from 'typeorm';
import { ExSymbolBase } from '@/db/models/ex-symbol-base';
import { ExTradeType } from '@/db/models/exchange-types';
import { ExOrder } from '@/db/models/ex-order';
import { Strategy } from '@/db/models/strategy';

export type DealOrder = Pick<
  ExOrder,
  'id' | 'exOrderId' | 'clientOrderId' | 'side' | 'execPrice' | 'execAmount'
>;

@Entity()
export class StrategyDeal extends ExSymbolBase {
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

  @Column('jsonb', { nullable: true })
  pendingOrder?: DealOrder;

  @Column('jsonb', { nullable: true })
  lastOrder?: DealOrder;

  @Column('numeric', { nullable: true })
  pnlUsd?: number;

  @Column()
  status: 'open' | 'closed' | 'canceled';

  @Column('jsonb', { select: false, nullable: true })
  params?: any;

  @Column('jsonb', { select: false, nullable: true })
  execInfo?: any;

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
    deal.status = 'open';
    return deal;
  }
}
