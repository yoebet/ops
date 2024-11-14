import { Column, Entity, Unique } from 'typeorm';
import { ExchangeCode, ExTradeType } from '@/db/models/exchange-types';
import { BaseModel } from '@/db/models/base-model';

@Entity()
@Unique(['exAssetId', 'coin'])
@Unique(['userExAccountId', 'tradeType', 'coin'])
export class ExAssetCoin extends BaseModel {
  // @Column()
  // userId: number;

  @Column()
  exAssetId: number;

  @Column()
  userExAccountId: number;

  @Column()
  ex: ExchangeCode;

  @Column()
  tradeType: ExTradeType;

  @Column()
  updatedAt: Date;

  @Column()
  coin: string;

  @Column('decimal', { nullable: true })
  eq?: number;

  @Column('decimal')
  availBal: number;

  @Column('decimal')
  frozenBal: number;

  @Column('decimal', { nullable: true })
  eqUsd?: number;

  @Column('decimal', { nullable: true })
  ordFrozen?: number;
}
