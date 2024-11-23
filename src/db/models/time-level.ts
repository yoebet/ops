import { BaseModel } from '@/db/models/base-model';
import { Column, Entity, Index } from 'typeorm';

// @Entity()
@Index(['interval'], { unique: true })
export class TimeLevel extends BaseModel {
  // month 1o
  @Column()
  interval: string;

  @Column()
  intervalSeconds: number;

  static evalIntervalSeconds(interval: string): number {
    const u = interval.charAt(interval.length - 1);
    const n = +interval.substring(0, interval.length - 1);
    if (u === 's') {
      return n;
    }
    if (u === 'm') {
      return n * 60;
    }
    const H = 60 * 60;
    if (u === 'h') {
      return n * H;
    }
    const D = 24 * H;
    if (u === 'd') {
      return n * D;
    }
    if (u === 'w') {
      return n * 7 * D;
    }
    if (u === 'o') {
      return n * 30 * D;
    }
    return 0;
  }
}
