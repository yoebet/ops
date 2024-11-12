import { BaseModel } from '@/db/models/base-model';
import { Column, Entity, Index } from 'typeorm';

@Entity()
export class User extends BaseModel {
  @Column()
  @Index({ unique: true })
  name: string;
}
