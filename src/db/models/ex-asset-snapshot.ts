import { Column, Entity, Unique } from 'typeorm';
import { ExAccountType, ExchangeCode } from '@/db/models/exchange-types';
import { BaseModel } from '@/db/models/base-model';
import { ExAssetSnapshotCoin } from '@/db/models/ex-asset-snapshot-coin';

@Entity()
@Unique(['time', 'userExAccountId', 'accountType'])
export class ExAssetSnapshot extends BaseModel {
  // @Column()
  // userId: number;

  @Column()
  time: Date;

  @Column()
  userExAccountId: number;

  @Column()
  ex: ExchangeCode;

  @Column()
  accountType: ExAccountType;

  @Column('decimal', { nullable: true })
  totalEqUsd?: number;

  coinAssets?: ExAssetSnapshotCoin[];
}
