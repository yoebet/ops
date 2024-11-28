import { Strategy } from '@/db/models/strategy';
import { Entity } from 'typeorm';
import { BacktestDeal } from '@/db/models/backtest-deal';

@Entity()
export class BacktestStrategy extends Strategy {
  currentDeal?: BacktestDeal;
  lastDeal?: BacktestDeal;
}
