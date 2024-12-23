import { Column, Entity, Index } from 'typeorm';
import { ExSymbolBase } from '@/db/models/strategy/ex-symbol-base';
import { ExTradeType } from '@/db/models/exchange-types';
import { ExOrder } from '@/db/models/ex-order';
import { Strategy } from '@/db/models/strategy/strategy';
import { AfterLoad } from 'typeorm/decorator/listeners/AfterLoad';

@Entity()
export class StrategyDeal extends ExSymbolBase {
  static listFields: (keyof StrategyDeal)[] = [
    'id',
    'pendingOrderId',
    'lastOrderId',
    'pnlUsd',
    'status',
    'openAt',
    'closedAt',
    'dealDuration',
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

  @Column('numeric', { nullable: true })
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

  pendingOrder?: ExOrder;
  lastOrder?: ExOrder;

  @AfterLoad()
  onLoaded() {
    if (this.pnlUsd != null) {
      this.pnlUsd = +this.pnlUsd;
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
