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
}

export class BacktestKlineData {
  private readonly timeLevelHolders: TimeLevelHolder[];
  private readonly lowestLevel: TimeLevelHolder;
  private readonly highestLevel: TimeLevelHolder;

  private currentLevel: TimeLevelHolder;
  private timeCursor: DateTime;

  constructor(
    private klineDataService: KlineDataService,
    private ex: ExchangeCode,
    private symbol: string,
    private timeLevels: TimeLevel[],
    private backtestTimeFrom: DateTime,
    private backtestTimeTo: DateTime,
    private preFetchCount = 60,
    private keepOldCount = 60,
  ) {
    timeLevels.sort((a, b) => a.intervalSeconds - b.intervalSeconds);
    const tlns: TimeLevelHolder[] = timeLevels.map((tl) => ({
      ...tl,
      intervalMs: tl.intervalSeconds * 1000,
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
    this.currentLevel = this.highestLevel;
    this.timeCursor = backtestTimeFrom;
    this.timeLevelHolders = tlns;
  }

  rollHighestTimeInterval(): boolean {
    const time = this.timeCursor.plus({
      second: this.highestLevel.intervalSeconds,
    });
    const ts = time.toMillis();
    if (ts > this.backtestTimeTo.toMillis()) {
      return false;
    }
    this.timeCursor = time;
    for (const { holder, intervalMs } of this.timeLevelHolders) {
      if (!holder) {
        continue;
      }
      if (holder.containsTs(ts)) {
        holder.stripBefore(ts - this.keepOldCount * intervalMs);
      } else {
        holder.clear();
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

  // moveUpLevel(): boolean {
  //   if (!this.currentLevel.higher) {
  //     return false;
  //   }
  //   this.currentLevel = this.currentLevel.higher;
  //   return true;
  // }

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

  async getKlines(): Promise<BacktestKline[]> {
    const tsFrom = this.timeCursor.toMillis();
    const { intervalSeconds, interval, intervalMs } = this.currentLevel;
    let holder = this.currentLevel.holder;
    if (!holder) {
      holder = new StKlinesHolder();
      this.currentLevel.holder = holder;
    } else {
      holder.stripBefore(tsFrom - this.keepOldCount * intervalMs);
    }
    const higherLevel = this.currentLevel.higher;
    const seconds = higherLevel?.intervalSeconds || intervalSeconds;
    const intervalTimesToHigher = higherLevel
      ? higherLevel.intervalSeconds / intervalSeconds
      : 1;
    const tsTo = tsFrom + (seconds - intervalSeconds) * 1000;

    if (holder.containsRange(tsFrom, tsTo)) {
      return holder.getByRange(tsFrom, tsTo);
    }

    const preFetchTo = tsFrom + (this.preFetchCount - 1) * intervalMs;
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
      limit: this.preFetchCount,
    });
    holder.append(kls);

    return holder.getByRange(tsFrom, tsTo);
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

    const tsTo = this.timeCursor.toMillis();
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
