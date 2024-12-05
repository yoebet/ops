import { TimeLevel } from '@/db/models/time-level';
import { ExchangeCode } from '@/db/models/exchange-types';
import { KlineDataService } from '@/data-service/kline-data.service';
import { DateTime } from 'luxon';
import { BacktestKline } from '@/data-service/models/kline';
import { BacktestKlineData } from '@/strategy-backtest/backtest-kline-data';

interface TimeLevelHolder extends TimeLevel {
  lower?: TimeLevelHolder;
  higher?: TimeLevelHolder;
  holder: BacktestKlineData;
}

export class BacktestKlineLevelsData {
  private readonly timeLevelHolders: TimeLevelHolder[];
  private readonly lowestLevel: TimeLevelHolder;
  private readonly highestLevel: TimeLevelHolder;

  private currentLevel: TimeLevelHolder;

  constructor(
    private klineDataService: KlineDataService,
    private ex: ExchangeCode,
    private symbol: string,
    private timeLevels: TimeLevel[],
    private backtestTimeFrom: DateTime,
    private backtestTimeTo: DateTime,
    private fetchCount = 60,
    private keepOldCount = 60,
  ) {
    timeLevels.sort((a, b) => a.intervalSeconds - b.intervalSeconds);
    const tlns: TimeLevelHolder[] = timeLevels.map((tl) => {
      const kld = new BacktestKlineData(
        klineDataService,
        ex,
        symbol,
        tl,
        backtestTimeFrom,
        fetchCount,
        keepOldCount,
      );
      return {
        ...tl,
        holder: kld,
      };
    });
    this.lowestLevel = tlns[0];
    this.highestLevel = tlns[tlns.length - 1];
    let lower: TimeLevelHolder = undefined;
    for (const tln of tlns) {
      tln.lower = lower;
      if (lower) {
        lower.higher = tln;
      }
      lower = tln;
    }
    this.timeLevelHolders = tlns;
    this.currentLevel = this.highestLevel;
  }

  getCurrentLevel(): TimeLevel {
    return this.currentLevel;
  }

  getIntervalEndTs(): number {
    const cl = this.currentLevel;
    return cl.holder.getTimeTs() + cl.intervalMs;
  }

  isLowestLevel(): boolean {
    return this.currentLevel === this.lowestLevel;
  }

  isTopLevel(): boolean {
    return this.currentLevel === this.highestLevel;
  }

  rollTimeInterval(): boolean {
    const cl = this.currentLevel;
    const time = cl.holder.getTimeCursor().plus({
      second: cl.intervalSeconds,
    });
    const ts = time.toMillis();
    if (cl.higher) {
      const hh = cl.higher.holder;
      const higherEnd = hh.getTimeTs() + cl.higher.intervalMs;
      if (ts >= higherEnd) {
        return false;
      }
    } else if (ts > this.backtestTimeTo.toMillis()) {
      return false;
    }
    cl.holder.resetTimeCursor(time);
    const lowerLevels = this.timeLevelHolders.filter(
      (l) => l.intervalSeconds < cl.intervalSeconds,
    );
    lowerLevels.forEach((l) => {
      l.holder.resetTimeCursor(time);
    });
    return true;
  }

  resetHighestLevel() {
    this.currentLevel = this.highestLevel;
  }

  resetLowestLevel() {
    this.currentLevel = this.lowestLevel;
  }

  resetLevel(interval: string) {
    const tlh = this.timeLevelHolders.find((l) => l.interval === interval);
    if (!tlh) {
      throw new Error(`no interval: ${interval}`);
    }
    this.currentLevel = tlh;
  }

  getCurrentTime(interval?: string): DateTime {
    let tlh: TimeLevelHolder;
    if (interval) {
      tlh = this.timeLevelHolders.find((l) => l.interval === interval);
      if (!tlh) {
        throw new Error(`no interval: ${interval}`);
      }
    } else {
      tlh = this.lowestLevel;
    }

    return tlh.holder.getTimeCursor();
  }

  getCurrentTs(interval?: string): number {
    return this.getCurrentTime(interval).toMillis();
  }

  moveDownLevel(): boolean {
    if (!this.currentLevel.lower) {
      return false;
    }
    this.currentLevel = this.currentLevel.lower;
    return true;
  }

  moveUpLevel(): boolean {
    if (!this.currentLevel.higher) {
      return false;
    }
    this.currentLevel = this.currentLevel.higher;
    return true;
  }

  moveOrRollTime(moveDown = true): boolean {
    if (moveDown) {
      const down = this.moveDownLevel();
      if (down) {
        return true;
      }
    }
    const roll = this.rollTimeInterval();
    if (roll) {
      return true;
    }
    while (true) {
      const up = this.moveUpLevel();
      if (!up) {
        return false;
      }
      const roll = this.rollTimeInterval();
      if (roll) {
        return true;
      }
    }
  }

  moveOver(): boolean {
    return this.moveOrRollTime(false);
  }

  async getLowestKlineAndMoveOn(): Promise<{
    kline: BacktestKline;
    hasNext: boolean;
  }> {
    this.resetLowestLevel();
    const kline = await this.getKline();
    let hasNext = this.rollTimeInterval();
    if (hasNext) {
      return { kline, hasNext };
    }
    while (true) {
      const up = this.moveUpLevel();
      if (!up) {
        return { kline, hasNext: false };
      }
      hasNext = this.rollTimeInterval();
      if (hasNext) {
        this.resetLowestLevel();
        return { kline, hasNext };
      }
    }
  }

  async getKlineAndMoveOn(interval: string): Promise<{
    kline: BacktestKline;
    hasNext: boolean;
  }> {
    this.resetLevel(interval);
    const kline = await this.getKline();
    let hasNext = this.rollTimeInterval();
    if (hasNext) {
      return { kline, hasNext };
    }
    while (true) {
      const up = this.moveUpLevel();
      if (!up) {
        return { kline, hasNext: false };
      }
      hasNext = this.rollTimeInterval();
      if (hasNext) {
        this.resetLevel(interval);
        return { kline, hasNext };
      }
    }
  }

  moveOnToTime(ts: number) {
    for (const tl of this.timeLevelHolders) {
      if (ts < tl.holder.getTimeTs()) {
        this.currentLevel = tl;
        const rolled = this.rollTimeInterval();
        if (!rolled) {
          continue;
        }
        ts += tl.intervalMs;
      }
    }
  }

  async getKline(): Promise<BacktestKline> {
    const holder = this.currentLevel.holder;
    return holder.getKline();
  }

  async getKlinesTillNow(
    interval: string,
    count: number,
  ): Promise<BacktestKline[]> {
    const tlh = this.timeLevelHolders.find((tl) => tl.interval === interval);
    if (!tlh) {
      throw new Error(`no time level: ${interval}`);
    }
    return tlh.holder.getKlinesTillNow(interval, count);
  }
}
