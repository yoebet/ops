import { Column, Entity, Unique } from 'typeorm';
import { ExAccountType, ExchangeCode } from '@/db/models/exchange-types';
import { BaseModel, NumericColumn } from '@/db/models/base-model';

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

  @NumericColumn({ nullable: true })
  eq?: number;

  @NumericColumn({ nullable: true })
  eqUsd?: number;

  @NumericColumn()
  availBal: number;

  @NumericColumn()
  frozenBal: number;

  @NumericColumn({ nullable: true })
  ordFrozen?: number;
}
