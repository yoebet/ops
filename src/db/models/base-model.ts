import {
  BaseEntity,
  BeforeInsert,
  CreateDateColumn,
  DeleteDateColumn,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { newId } from '@/common/utils/utils';
import { Exclude } from 'class-transformer';

export class BaseModel extends BaseEntity {
  @Exclude()
  @PrimaryColumn({
    type: 'varchar',
    length: '64',
  })
  id: string;

  // @Exclude()
  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @Exclude()
  @DeleteDateColumn()
  deletedAt?: Date;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) {
      this.id = newId();
    }
  }
}
