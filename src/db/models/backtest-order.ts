import { Column, Entity } from 'typeorm';
import { ExOrder } from '@/db/models/ex-order';

@Entity()
export class BacktestOrder extends ExOrder {
  @Column()
  taskId: number;
}
