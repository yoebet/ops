import { Column, Entity, Unique } from 'typeorm';
import { ExAccountType, ExchangeCode } from '@/db/models/exchange-types';
import { BaseModel } from '@/db/models/base-model';
import { AfterLoad } from 'typeorm/decorator/listeners/AfterLoad';

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

  @Column('numeric', { nullable: true })
  eq?: number;

  @Column('numeric', { nullable: true })
  eqUsd?: number;

  @Column('numeric')
  availBal: number;

  @Column('numeric')
  frozenBal: number;

  @Column('numeric', { nullable: true })
  ordFrozen?: number;

  @AfterLoad()
  onLoaded() {
    const numFields: (keyof ExAssetSnapshotCoin)[] = [
      'eq',
      'eqUsd',
      'availBal',
      'frozenBal',
      'ordFrozen',
    ];
    for (const key of numFields) {
      if (this[key] != null) {
        (this as any)[key] = +this[key];
      }
    }
  }
}
