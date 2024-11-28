import { Column, Entity } from 'typeorm';
import { BaseModel } from '@/db/models/base-model';

@Entity()
export class BacktestTask extends BaseModel {
  @Column()
  strategyId: number; // BackTestStrategy.id

  // 2024-10-30
  @Column({ nullable: true })
  dataStartDate?: string;

  @Column({ nullable: true })
  dataEndDate?: string;

  @Column({ nullable: true })
  startedAt?: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  @Column({ nullable: true })
  jobSummited?: boolean;
}
