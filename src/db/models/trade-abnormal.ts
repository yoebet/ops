import { Trade } from '@/db/models/trade';
import { Column, Entity } from 'typeorm';

@Entity({ synchronize: false })
export class TradeAbnormal extends Trade {
  @Column()
  status: string; // pending, accepted, to-accept, reject

  @Column({ nullable: true })
  memo?: string;
}
