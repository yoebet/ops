import { Column, Entity } from 'typeorm';
import { ExSymbolBase } from '@/db/models/ex-symbol-base';
import { TradeSide } from '@/data-service/models/base';

@Entity()
export class ExOrder extends ExSymbolBase {
  @Column()
  side: TradeSide;

  // cash, isolated, cross
  @Column()
  mode: string = 'cash';

  // market：市价单
  // limit：限价单
  // post_only：只做maker单
  // fok：全部成交或立即取消
  // ioc：立即成交并取消剩余
  @Column()
  type: string;

  // filled, canceled
  @Column()
  status: string;

  @Column({ nullable: true })
  orderId?: string;

  @Column()
  clientOrderId: string;

  @Column({ nullable: true })
  positionId?: string;

  // ---

  @Column({ nullable: true })
  reqPrice?: number;

  @Column({ nullable: true })
  reqSize?: number;

  @Column({ nullable: true })
  quoteAmount?: number;

  // ---

  @Column({ nullable: true })
  execAvgPrice?: number;

  @Column({ nullable: true })
  execSize?: number;

  @Column({ nullable: true })
  execAmount?: number;
}
