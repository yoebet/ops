import { BaseModel } from '@/db/models/base-model';
import { Column, Entity, Index } from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity()
@Index(['coin'], { unique: true })
export class CoinConfig extends BaseModel {
  @Column()
  coin: string;

  @Column({ nullable: true })
  name?: string;

  @Exclude()
  @Column({ default: 0 })
  displayOrder: number;

  // 大小单界限候选项
  // 斜杠分隔，可以用K/M单位
  // 如 0.5/1/2
  @Column({ nullable: true })
  volumeSmallMax?: string;

  @Column({ nullable: true })
  volumeBigMin?: string;

  // 如 5K/10K/20K
  @Column({ nullable: true })
  usdVolumeSmallMax?: string;

  @Column({ nullable: true })
  usdVolumeBigMin?: string;
}
