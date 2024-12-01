import { Holder } from '@/data-ex/kline-data-holder';
import { TimeLevel } from '@/db/models/time-level';
import { ExchangeCode } from '@/db/models/exchange-types';
import { KlineDataService } from '@/data-service/kline-data.service';
import { DateTime } from 'luxon';
import { BacktestKline } from '@/data-service/models/kline';

export class StKlinesHolder extends Holder<BacktestKline> {}

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

  rollTimeInterval(): void {
    this.timeCursor = this.timeCursor.plus({
      second: this.timeLevel.intervalSeconds,
    });
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

  async getKline(): Promise<BacktestKline> {
    const { interval, intervalSeconds } = this.timeLevel;
    const intervalMs = intervalSeconds * 1000;
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

  async getKlinesTillNow(
    interval: string,
    count: number,
  ): Promise<BacktestKline[]> {
    const { intervalSeconds } = this.timeLevel;
    const intervalMs = intervalSeconds * 1000;

    const holder = this.holder;

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
