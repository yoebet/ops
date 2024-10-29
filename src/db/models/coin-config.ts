import { BaseModel } from '@/db/models/base-model';
import { Column, Entity, Index } from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity()
export class CoinConfig extends BaseModel {
  @Column()
  @Index({ unique: true })
  coin: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ default: false })
  stable: boolean = false;

  @Exclude()
  @Column({ default: 0 })
  displayOrder: number;
}
