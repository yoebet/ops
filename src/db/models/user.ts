import { Column, Entity } from 'typeorm';
import { BaseModel } from '@/db/models/base-model';

@Entity()
export class User extends BaseModel {
  @Column({ unique: true })
  username: string;

  @Column({ select: false })
  password?: string;

  @Column({ nullable: true })
  role?: string;

  @Column({ nullable: true })
  email?: string;
}
