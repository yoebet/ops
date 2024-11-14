import { Column, Entity, Unique } from 'typeorm';
import {
  ExchangeCode,
  ExMarket,
  ExTradeType,
} from '@/db/models/exchange-types';
import { BaseModel } from '@/db/models/base-model';

@Entity()
@Unique(['userExAccountId', 'tradeType'])
export class ExAsset extends BaseModel {
  // @Column()
  // userId: number;

  @Column()
  userExAccountId: number;

  @Column()
  ex: ExchangeCode;

  // @Column()
  // market: ExMarket;

  @Column()
  tradeType: ExTradeType;

  @Column()
  updatedAt: Date;

  @Column('decimal', { nullable: true })
  totalEqUsd?: number;
}
