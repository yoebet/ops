import { BaseModel } from '@/db/models/base-model';
import { Column, Entity, Index } from 'typeorm';

@Entity()
@Index(UserSetting.UNIQUE_FIELDS, { unique: true })
export class UserSetting extends BaseModel {
  static UNIQUE_FIELDS = ['userId', 'cat', 'scope', 'key'];

  @Column()
  userId: string;

  @Column()
  cat: string;

  @Column()
  scope: string;

  @Column()
  key: string;

  @Column({ nullable: true })
  memo?: string;

  @Column({ type: 'jsonb', nullable: true })
  digest?: any;

  @Column({ type: 'jsonb' })
  content: any;
}
