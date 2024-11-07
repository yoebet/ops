import { Holder } from '@/data-ex/kline-data-holder';
import { TimeLevel } from '@/db/models/time-level';
import { ExchangeCode } from '@/db/models/exchange-types';
import { KlineDataService } from '@/data-service/kline-data.service';
import { DateTime } from 'luxon';
import { FtKline, Kline2 } from '@/data-service/models/kline';

export class StKlinesHolder extends Holder<FtKline> {}

export class BacktestKlineData {
  holder: StKlinesHolder;

  constructor(
    private klineDataService: KlineDataService,
    private ex: ExchangeCode,
    private symbol: string,
    private timeLevel: TimeLevel,
    private timeCursor: DateTime,
    private fetchCount = 60,
    private keepOldCount = 60,
  ) {
    this.holder = new StKlinesHolder();
  }

  getTimeCursor() {
    return this.timeCursor;
  }

  getTimeTs() {
    return this.timeCursor.toMillis();
  }

  getSymbol() {
    return this.symbol;
  }

  protected checkStrip() {
    const ts = this.getTimeTs();
    const holder = this.holder;
    if (holder.containsTs(ts)) {
      holder.stripBefore(ts - this.keepOldCount * this.timeLevel.intervalMs);
    } else {
      holder.clear();
    }
  }

  rollTimeInterval(): void {
    this.timeCursor = this.timeCursor.plus({
      second: this.timeLevel.intervalSeconds,
    });
    this.checkStrip();
  }

  resetTimeCursor(tc: DateTime): void {
    this.timeCursor = tc;
    this.checkStrip();
  }

  protected async fetchKlines(params: {
    tsFrom: number;
    tsTo: number;
    interval: string;
    limit?: number;
  }) {
    return this.klineDataService.queryKLines({
      ...params,
      ex: this.ex,
      symbol: this.symbol,
    });
  }

  async getKline(): Promise<FtKline | undefined> {
    const { interval, intervalMs } = this.timeLevel;
    const tsFrom = this.timeCursor.toMillis();
    const holder = this.holder;
    holder.stripBefore(tsFrom - this.keepOldCount * intervalMs);

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

  async getKlinesTillNow(interval: string, count: number): Promise<FtKline[]> {
    const { intervalMs } = this.timeLevel;

    const tsTo = this.timeCursor.toMillis();
    const tsFrom = tsTo - (count - 1) * intervalMs;

    const holder = this.holder;
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
