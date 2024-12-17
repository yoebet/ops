import { BaseEntity, CreateDateColumn, DeleteDateColumn, Index } from 'typeorm';
import { Exclude } from 'class-transformer';
import { PrimaryGeneratedColumn } from 'typeorm/decorator/columns/PrimaryGeneratedColumn';

export class BaseModel extends BaseEntity {
  @PrimaryGeneratedColumn({
    type: 'int',
  })
  id: number;

  @Exclude()
  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @Exclude()
  @DeleteDateColumn()
  deletedAt?: Date;
}
