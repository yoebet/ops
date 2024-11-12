import { BaseModel } from '@/db/models/base-model';
import { Column, Entity } from 'typeorm';
import { ExchangeCode } from '@/db/models/exchange-types';

@Entity()
export class UserExAccount extends BaseModel {
  @Column()
  userId: number;

  @Column()
  ex: ExchangeCode;

  @Column()
  name: string;

  @Column()
  apikeyKey: string;

  @Column()
  apikeySecret: string;

  @Column({ nullable: true })
  apikeyPassword?: string;
}
