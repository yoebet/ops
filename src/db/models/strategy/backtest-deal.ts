import { Entity } from 'typeorm';
import { StrategyDeal } from '@/db/models/strategy/strategy-deal';
import { BacktestOrder } from '@/db/models/strategy/backtest-order';
import { BacktestStrategy } from '@/db/models/strategy/backtest-strategy';

@Entity()
export class BacktestDeal extends StrategyDeal {
  pendingOrder?: BacktestOrder;
  lastOrder?: BacktestOrder;

  static newStrategyDeal(strategy: BacktestStrategy): BacktestDeal {
    const deal = new BacktestDeal();
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
