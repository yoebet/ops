import { BaseModel } from '@/db/models/base-model';
import { Column, Entity, Index } from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity()
@Index(['interval'], { unique: true })
export class TimeLevel extends BaseModel {
  // TODO: month 1o
  @Column()
  interval: string;

  @Column()
  intervalSeconds: number;

  @Exclude()
  @Column({ default: true })
  visibleToClient: boolean;

  @Column({ comment: 'tick 倍数' })
  prlFrom: number;

  @Column({ comment: 'tick 倍数' })
  prlTo: number;

  @Exclude()
  @Column({ comment: '从哪一级汇总数据', nullable: true })
  rollupFromInterval?: string;
}
