import { Holder } from '@/data-ex/kline-data-holder';
import { TimeLevel } from '@/db/models/time-level';
import { ExchangeCode } from '@/db/models/exchange-types';
import { KlineDataService } from '@/data-service/kline-data.service';
import { DateTime } from 'luxon';
import { BacktestKline } from '@/data-service/models/kline';

export class StKlinesHolder extends Holder<BacktestKline> {}

interface TimeLevelHolder extends TimeLevel {
  intervalMs: number;
  lower?: TimeLevelHolder;
  higher?: TimeLevelHolder;
  holder?: StKlinesHolder;
  timeCursor?: DateTime;
}

export class BacktestKlineData {
  private readonly timeLevelHolders: TimeLevelHolder[];
  private readonly lowestLevel: TimeLevelHolder;
  private readonly highestLevel: TimeLevelHolder;

  private currentLevel: TimeLevelHolder;

  // private timeCursor: DateTime;

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
    const tlns: TimeLevelHolder[] = timeLevels.map((tl) => ({
      ...tl,
      intervalMs: tl.intervalSeconds * 1000,
      timeCursor: backtestTimeFrom,
    }));
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

  getCurrentLevel(): TimeLevel & { timeCursor?: DateTime } {
    return this.currentLevel;
  }

  isLowestLevel(): boolean {
    return this.currentLevel === this.lowestLevel;
  }

  isTopLevel(): boolean {
    return this.currentLevel === this.highestLevel;
  }

  rollTimeInterval(): boolean {
    const cl = this.currentLevel;
    const time = cl.timeCursor.plus({
      second: cl.intervalSeconds,
    });
    const ts = time.toMillis();
    if (cl.higher) {
      const higherEnd = cl.higher.timeCursor.toMillis() + cl.higher.intervalMs;
      if (ts >= higherEnd) {
        return false;
      }
    }
    if (ts > this.backtestTimeTo.toMillis()) {
      return false;
    }
    cl.timeCursor = time;
    const lowerLevels = this.timeLevelHolders.filter(
      (l) => l.intervalSeconds < cl.intervalSeconds,
    );
    lowerLevels.forEach((l) => {
      l.timeCursor = cl.timeCursor;
    });
    for (const ll of [...lowerLevels, cl]) {
      if (!ll.holder) {
        continue;
      }
      if (ll.holder.containsTs(ts)) {
        ll.holder.stripBefore(ts - this.keepOldCount * ll.intervalMs);
      } else {
        ll.holder.clear();
      }
    }
    return true;
  }

  resetHighestLevel() {
    this.currentLevel = this.highestLevel;
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

  protected async fetchKlines(params: {
    tsFrom: number;
    tsTo: number;
    interval: string;
    limit?: number;
  }) {
    return this.klineDataService.queryKLinesForBacktest({
      ...params,
      ex: this.ex,
      symbol: this.symbol,
    });
  }

  async getKlinesInUpperLevel(): Promise<BacktestKline[]> {
    const {
      interval,
      intervalSeconds,
      intervalMs,
      timeCursor,
      higher: higherLevel,
    } = this.currentLevel;
    const tsFrom = timeCursor.toMillis();
    let holder = this.currentLevel.holder;
    if (!holder) {
      holder = new StKlinesHolder();
      this.currentLevel.holder = holder;
    } else {
      holder.stripBefore(tsFrom - this.keepOldCount * intervalMs);
    }
    const seconds = higherLevel?.intervalSeconds || intervalSeconds;
    const intervalTimesToHigher = higherLevel
      ? higherLevel.intervalSeconds / intervalSeconds
      : 1;
    const tsTo = tsFrom + (seconds - intervalSeconds) * 1000;

    if (holder.containsRange(tsFrom, tsTo)) {
      return holder.getByRange(tsFrom, tsTo);
    }

    const preFetchTo = tsFrom + (this.fetchCount - 1) * intervalMs;
    const fetchTo = Math.max(tsTo, preFetchTo);
    let fetchFrom = tsFrom;

    const lastTs = holder.getLastTs();
    if (!holder.containsTs(tsFrom)) {
      if (lastTs && Date.now() - lastTs <= intervalTimesToHigher * intervalMs) {
        fetchFrom = lastTs + intervalMs;
      } else {
        holder.clear();
      }
    } else {
      fetchFrom = lastTs + intervalMs;
    }
    const kls = await this.fetchKlines({
      interval,
      tsFrom: fetchFrom,
      tsTo: fetchTo,
      limit: this.fetchCount,
    });
    holder.append(kls);

    return holder.getByRange(tsFrom, tsTo);
  }

  async getKline(): Promise<BacktestKline> {
    const { interval, intervalMs, timeCursor } = this.currentLevel;
    const tsFrom = timeCursor.toMillis();
    let holder = this.currentLevel.holder;
    if (!holder) {
      holder = new StKlinesHolder();
      this.currentLevel.holder = holder;
    } else {
      holder.stripBefore(tsFrom - this.keepOldCount * intervalMs);
    }

    if (holder.containsTs(tsFrom)) {
      const kls = holder.getByRange(tsFrom, tsFrom + intervalMs - 1);
      return kls.length > 0 ? kls[0] : undefined;
    }

    const fetchTo = tsFrom + (this.fetchCount - 1) * intervalMs;
    let fetchFrom = tsFrom;

    const lastTs = holder.getLastTs();
    if (!holder.containsTs(tsFrom)) {
      if (lastTs && Date.now() - lastTs <= (this.fetchCount / 2) * intervalMs) {
        fetchFrom = lastTs + intervalMs;
      } else {
        holder.clear();
      }
    } else {
      fetchFrom = lastTs + intervalMs;
    }
    const newKls = await this.fetchKlines({
      interval,
      tsFrom: fetchFrom,
      tsTo: fetchTo,
      limit: this.fetchCount,
    });
    holder.append(newKls);

    const kls = holder.getByRange(tsFrom, tsFrom + intervalMs - 1);
    return kls.length > 0 ? kls[0] : undefined;
  }

  async getKlinesTillNow(
    interval: string,
    count: number,
  ): Promise<BacktestKline[]> {
    const tlh = this.timeLevelHolders.find((tl) => tl.interval === interval);
    if (!tlh) {
      throw new Error(`no time level: ${interval}`);
    }
    const { intervalMs } = tlh;

    let holder = this.currentLevel.holder;
    if (!holder) {
      holder = new StKlinesHolder();
      this.currentLevel.holder = holder;
    }

    const tsTo = tlh.timeCursor.toMillis();
    const tsFrom = tsTo - (count - 1) * intervalMs;

    if (holder.containsRange(tsFrom, tsTo)) {
      return holder.getByRange(tsFrom, tsTo);
    }

    const kls = await this.fetchKlines({
      interval,
      tsFrom,
      tsTo,
      // limit: count,
    });
    holder.prepend(kls);

    return holder.getByRange(tsFrom, tsTo);
  }
}
