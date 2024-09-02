import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';
import { ExchangeCode } from '@/exchange/exchanges-types';
import { TradeSide } from '@/db/models-data/base';

@Entity({ synchronize: false })
export class Trade extends BaseEntity {
  @PrimaryColumn()
  dataId: number;

  @Column()
  time: Date;

  @Column()
  ex: ExchangeCode | string;
  @Column()
  symbol: string;

  @Column()
  tradeId: string;

  @Column()
  side: TradeSide;
  @Column()
  size: number;
  @Column()
  amount: number;
  @Column()
  price: number;

  @Column({ nullable: true })
  csize?: number;
  @Column({ nullable: true })
  block?: number;

  @Column()
  createTime: Date;
}
