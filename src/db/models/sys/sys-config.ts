import { BaseModel } from '@/db/models/base-model';
import { Column, Entity, Index } from 'typeorm';
import { ValueType } from '@/common/sys-config.type';

@Entity()
@Index(['scope', 'key'], { unique: true })
export class SysConfig extends BaseModel {
  @Column()
  scope: string;

  @Column()
  key: string;

  @Column()
  value: string;

  @Column()
  valueType: ValueType;
}
