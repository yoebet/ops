import { ExKline } from '@/exchange/exchange-service-types';

export interface Timed {
  ts: number;
}

export class Holder<T extends Timed> {
  // scopeKey: string;

  // sorted
  data: T[] = [];

  getFirstTs(): number | undefined {
    const data = this.data;
    if (data.length === 0) {
      return undefined;
    }
    return data[0].ts;
  }

  getLastTs(): number | undefined {
    const data = this.data;
    if (data.length === 0) {
      return undefined;
    }
    const last = data[data.length - 1];
    return last.ts;
  }

  getTsRange(): { min: number; max: number } | undefined {
    const data = this.data;
    if (data.length === 0) {
      return undefined;
    }
    const first = data[0];
    const last = data[data.length - 1];
    return { min: first.ts, max: last.ts };
  }

  keepLatest(count: number) {
    const len = this.data.length;
    if (len > count) {
      this.data = this.data.slice(len - count);
    }
  }

  checkAndStrip(triggerCount: number, keepCount: number) {
    const len = this.data.length;
    if (len >= triggerCount) {
      this.keepLatest(keepCount);
    }
  }

  getBefore(beforeTs: number, maxCount: number): T[] | undefined {
    const firstTs = this.getFirstTs();
    if (!firstTs || firstTs > beforeTs) {
      return undefined;
    }
    const beforeIdx = this.data.findIndex((t) => t.ts === beforeTs);
    if (beforeIdx === -1) {
      return undefined;
    }
    if (beforeIdx <= maxCount) {
      return this.data.slice(0, beforeIdx);
    }
    return this.data.slice(beforeIdx - maxCount, beforeIdx);
  }

  getLatest(maxCount: number): T[] {
    const len = this.data.length;
    if (len <= maxCount) {
      return this.data;
    }
    return this.data.slice(len - maxCount);
  }

  getByRange(from: number, to?: number): T[] {
    const fromIdx = this.data.findIndex((t) => t.ts >= from);
    if (fromIdx === -1) {
      return [];
    }
    const sliced = this.data.slice(fromIdx);
    if (!to) {
      return sliced;
    }
    const toIdx = sliced.findIndex((t) => t.ts > to);
    if (toIdx === -1) {
      return sliced;
    }
    return sliced.slice(0, toIdx);
  }

  protected sort(data: T[]) {
    data.sort((a, b) => a.ts - b.ts);
  }

  reset(data: T[], options: { sort?: boolean } = {}) {
    if (options.sort) {
      this.sort(data);
    }
    this.data = data;
  }

  append(data: T[], options: { sort?: boolean; duplicated?: boolean } = {}) {
    if (options.sort) {
      this.sort(data);
    }
    if (options.duplicated && data.length > 0) {
      const first = data[0];
      this.data = this.data.filter((a) => a.ts < first.ts);
    }
    this.data = this.data.concat(data);
    // console.log('append: ' + data.length);
  }

  prepend(data: T[], options: { sort?: boolean; duplicated?: boolean } = {}) {
    if (options.sort) {
      this.sort(data);
    }
    if (options.duplicated && data.length > 0) {
      const last = data[data.length - 1];
      this.data = this.data.filter((a) => a.ts > last.ts);
    }
    this.data = data.concat(this.data);
  }

  patch(data: T[]) {
    if (data.length === 0) {
      return;
    }
    const tsMap = new Map<number, T>(data.map((a) => [a.ts, a]));
    this.data = this.data.filter((a) => !tsMap.has(a.ts));
    this.data = this.data.concat(data);
    this.sort(this.data);
    // console.log('patch: ' + data.length);
  }
}

export class KlinesHolder extends Holder<ExKline> {}
