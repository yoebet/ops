import { BaseModel } from '@/db/models/base-model';
import { Column, Entity, Index } from 'typeorm';
import { ExchangeCode } from '@/db/models/exchange-types';
import { ExApiKey } from '@/exchange/base/rest/rest.type';

@Entity()
export class UserExAccount extends BaseModel {
  @Column()
  userId: number;

  @Column()
  ex: ExchangeCode;

  @Column()
  name: string;

  @Column()
  @Index({ unique: true })
  apikeyKey: string;

  @Column()
  apikeySecret: string;

  @Column({ nullable: true })
  apikeyPassword?: string;

  @Column({ nullable: true })
  apikeyLabel?: string;

  static buildExApiKey(ue: UserExAccount): ExApiKey {
    return {
      key: ue.apikeyKey,
      secret: ue.apikeySecret,
      password: ue.apikeyPassword,
    };
  }
}
