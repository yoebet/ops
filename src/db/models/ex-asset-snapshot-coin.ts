import { Column, Entity, Unique } from 'typeorm';
import { ExAccountType, ExchangeCode } from '@/db/models/exchange-types';
import { BaseModel } from '@/db/models/base-model';

@Entity()
@Unique(['snapshotId', 'coin'])
@Unique(['time', 'userExAccountId', 'accountType', 'coin'])
export class ExAssetSnapshotCoin extends BaseModel {
  // @Column()
  // userId: number;

  @Column()
  time: Date;

  @Column()
  snapshotId: number;

  @Column()
  userExAccountId: number;

  @Column()
  ex: ExchangeCode;

  @Column()
  accountType: ExAccountType;

  @Column()
  coin: string;

  @Column('decimal', { nullable: true })
  eq?: number;

  @Column('decimal', { nullable: true })
  eqUsd?: number;

  @Column('decimal')
  availBal: number;

  @Column('decimal')
  frozenBal: number;

  @Column('decimal', { nullable: true })
  ordFrozen?: number;
}
