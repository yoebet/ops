import { Column, Entity, Index } from 'typeorm';
import { ExSymbolBase } from '@/db/models/ex-symbol-base';
import { ExTradeType } from '@/db/models/exchange-types';
import { ExOrder } from '@/db/models/ex-order';
import { Strategy } from '@/db/models/strategy';
import { AfterLoad } from 'typeorm/decorator/listeners/AfterLoad';

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

  @Column({ nullable: true })
  pendingOrderId?: number;

  @Column({ nullable: true })
  lastOrderId?: number;

  @Column('numeric', { nullable: true })
  pnlUsd?: number;

  @Column()
  status: 'open' | 'closed' | 'canceled';

  @Column('jsonb', { select: false, nullable: true })
  params?: any;

  @Column('jsonb', { select: false, nullable: true })
  execInfo?: any;

  @Column({ nullable: true })
  paperTrade?: boolean;

  @Column({ nullable: true })
  closedAt?: Date;

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
