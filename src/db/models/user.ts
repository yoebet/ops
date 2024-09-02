import { Column, Entity } from 'typeorm';
import { BaseModel } from '@/db/models/base-model';

@Entity()
export class User extends BaseModel {
  @Column({ unique: true })
  userId: string;

  @Column({ nullable: true })
  bs?: string;

  @Column({ nullable: true })
  plan?: string;

  @Column({ nullable: true })
  role?: string;

  @Column({ nullable: true })
  memo?: string;

  @Column({ nullable: true, type: 'jsonb' })
  ext?: any;
}
