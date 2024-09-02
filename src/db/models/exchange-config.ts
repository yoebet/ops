import { Column, Entity, Index } from 'typeorm';
import { BaseModel } from '@/db/models/base-model';
import { Exclude } from 'class-transformer';
import { ExchangeCode } from '@/exchange/exchanges-types';

@Entity()
export class ExchangeConfig extends BaseModel {
  @Column()
  @Index({ unique: true })
  ex: ExchangeCode;

  @Column()
  name: string;

  @Exclude()
  @Column({ type: 'bool', default: true })
  enabled = true;

  @Column({ default: 0 })
  displayOrder: number;

  @Exclude()
  @Column({ default: true })
  visibleToClient: boolean;
}
