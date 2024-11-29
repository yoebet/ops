// import { BaseModel } from '@/db/models/base-model';
// import { Column, Entity, Index } from 'typeorm';

// @Entity()
// @Index(['interval'], { unique: true })
export class TimeLevel {
  // month 1o
  // @Column()
  interval: string;

  // @Column()
  intervalSeconds: number;

  static ALL = ['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1o'].map(
    (interval) => {
      const tl = new TimeLevel();
      tl.interval = interval;
      tl.intervalSeconds = TimeLevel.evalIntervalSeconds(interval);
      return tl;
    },
  );

  static TL1mTo1d = TimeLevel.ALL.slice(0, -2);

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
