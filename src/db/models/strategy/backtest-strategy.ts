import { Strategy } from '@/db/models/strategy/strategy';
import { Column, Entity } from 'typeorm';
import { BacktestDeal } from '@/db/models/strategy/backtest-deal';

@Entity()
export class BacktestStrategy extends Strategy {
  static btListFields: (keyof BacktestStrategy)[] = (
    [
      'dataFrom',
      'dataTo',
      'startedAt',
      'completedAt',
    ] as (keyof BacktestStrategy)[]
  ).concat(Strategy.listFields);

  // 2024-10-30
  @Column()
  dataFrom: string;

  @Column()
  dataTo: string;

  @Column({ nullable: true })
  startedAt?: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  currentDeal?: BacktestDeal;
  lastDeal?: BacktestDeal;
}
