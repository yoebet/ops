import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_SCHEMA } from '@/env';
import { AppLogger } from '@/common/app-logger';
import { tsToISO8601 } from '@/common/utils/utils';
import { ES } from '@/data-service/models/base';
import { Kline2, Kline, FtKline } from '@/data-service/models/kline';
import {
  MultiSymbolsKlineParams,
  KlineParams,
} from '@/data-service/models/query-params';

export function getLimit(limit?: number): number {
  return typeof limit === 'number' ? Math.min(limit, 100_000) : 1000;
}

const KlNumericFields = [
  'open',
  'high',
  'low',
  'close',
  'size',
  'amount',
  'sa',
  'ss',
  'ba',
  'bs',
  // 'p_ch',
  // 'p_avg',
  // 'p_cp',
  // 'p_ap',
];

const KlNumericFieldsStr = KlNumericFields.join(',');

const KlAggSumFields = `  sum(size) as size,
  sum(amount) as amount,
  sum(bs) as bs,
  sum(ba) as ba,
  sum(ss) as ss,
  sum(sa) as sa `;

export const KlRollupMap = {
  open: 'first(open, time)',
  high: 'max(high)',
  low: 'max(low)',
  close: 'last(close, time)',
};

const KlOhlcRollupFields = ['open', 'high', 'low', 'close']
  .map((f) => KlRollupMap[f] || `sum(${f})` + ` as ${f}`)
  .join(',');

@Injectable()
export class KlineDataService implements OnModuleInit {
  constructor(
    private logger: AppLogger,
    @InjectDataSource(DB_SCHEMA)
    private dataSource: DataSource,
  ) {
    logger.setContext('market-data');
  }

  async onModuleInit() {}

  async saveKlines(
    interval: string,
    klines: Kline[],
    options?: { updateOnConflict?: boolean },
  ): Promise<number> {
    if (klines.length === 0) {
      return;
    }
    if (klines.some((k) => k.interval && k.interval !== interval)) {
      throw new Error('wrong interval');
    }

    let onConflictClause = 'DO NOTHING';
    if (options?.updateOnConflict) {
      onConflictClause = `("time", ex, symbol) DO UPDATE set
      tds=EXCLUDED.tds,
      size=EXCLUDED.size,
      amount=EXCLUDED.amount,
      bs=EXCLUDED.bs,
      ba=EXCLUDED.ba,
      ss=EXCLUDED.ss,
      sa=EXCLUDED.sa,
      open=EXCLUDED.open,
      high=EXCLUDED.high,
      low=EXCLUDED.low,
      close=EXCLUDED.close,
      p_ch=EXCLUDED.p_ch,
      p_avg=EXCLUDED.p_avg,
      p_cp=EXCLUDED.p_cp,
      p_ap=EXCLUDED.p_ap
      `;
    }

    for (const k of klines) {
      if (k.p_ch == null) {
        k.p_ch = k.close - k.open;
        k.p_avg = k.size > 0 ? k.amount / k.size : 0;
        k.p_cp = (k.p_ch / k.open) * 100.0;
        k.p_ap = (Math.abs(k.high - k.low) / k.low) * 100.0;
      }
    }

    const rows = klines
      .map(
        (t) => `(
        '${t.time.toISOString()}','${t.ex}','${t.market}','${t.symbol}','${t.base}','${t.quote}','${interval}',
 ${t.tds},${t.size},${t.amount},${t.bs},${t.ba},${t.ss},${t.sa},
 ${t.open},${t.high},${t.low},${t.close},${t.p_ch},${t.p_avg},${t.p_cp},${t.p_ap}
 )`,
      )
      .join(',\n');

    const sql = `INSERT INTO ${this.getKLineTable(interval)}
                 ("time", ex, market, symbol, base, quote, "interval",
                  tds, "size", amount, bs, ba, ss, sa,
                  "open", high, low, "close", p_ch, p_avg, p_cp, p_ap)
    VALUES
    ${rows}
 ON CONFLICT
    ${onConflictClause}
    RETURNING
    tds`;

    const res = await this.dataSource.query(sql);
    const saved = res.length;
    if (saved !== klines.length) {
      this.logger.warn(`saved: ${saved} (passed: ${klines.length})`);
    } else {
      this.logger.debug(`saved: ${saved}`);
    }
    return res.length;
  }

  async queryBySql(sql: string): Promise<any> {
    // this.logger.debug(sql);
    return await this.dataSource.query(sql);
  }

  getKLineTable(interval: string): string {
    return `${DB_SCHEMA}.kline_${interval}`;
    // return `kline_${interval}`;
  }

  private isMultiSymbols(params: ES[]): boolean {
    return params && params.length !== 1;
  }

  protected timeCondition(parameter: {
    tsFrom?: number;
    tsTo?: number;
    interval?: string;
  }): { cond: string; timeSort: 'asc' | 'desc' } {
    const { tsFrom, tsTo } = parameter;
    let timeTo = tsTo;
    if (!tsFrom && !tsTo) {
      timeTo = Date.now();
    }
    const conds: string[] = [];
    if (tsFrom) {
      conds.push(`time >= '${tsToISO8601(tsFrom)}'`);
    }
    if (timeTo) {
      conds.push(`time <= '${tsToISO8601(timeTo)}'`);
    }
    const cond = conds.join(' and ');
    const timeSort = tsFrom ? 'asc' : 'desc';
    return { cond, timeSort };
  }

  protected symbolCondition(symbols: ES[]) {
    if (symbols.length === 0) {
      return '';
    }
    if (symbols.length === 1) {
      const s = symbols[0];
      return ` and symbol='${s.symbol}' and ex='${s.ex}'`;
    }
    const pArray: string[] = [];
    for (const s of symbols) {
      pArray.push(`(symbol='${s.symbol}' and ex='${s.ex}')`);
    }
    return ` and ( ${pArray.join(' or ')} )`;
  }

  async queryKLines(params: KlineParams): Promise<FtKline[]> {
    const limit = params.limit || 120;
    const { ex, symbol, interval } = params;
    const { cond: timeCond, timeSort } = this.timeCondition(params);

    const sql = `select time,
                        ${KlNumericFieldsStr}
                 from ${this.getKLineTable(interval)}
                 where ${timeCond}
                   and ex = '${ex}'
                   and symbol = '${symbol}'
                 order by time ${timeSort}
                 limit ${getLimit(limit)}`;

    const kls = await this.queryBySql(sql);
    if (timeSort === 'desc') {
      kls.reverse();
    }
    kls.forEach((k: Kline2) => {
      k.ts = k.time.getTime();
      for (const f of KlNumericFields) {
        if (k[f] != null) {
          k[f] = +k[f];
        }
      }
    });
    return kls;
  }

  async queryKLines2(params: MultiSymbolsKlineParams): Promise<FtKline[]> {
    const limit = params.limit || 120;
    const { symbols, interval } = params;
    const { cond: timeCond, timeSort } = this.timeCondition(params);

    let kls: FtKline[];
    if (this.isMultiSymbols(symbols) && params.zipSymbols) {
      const sql = `select time,
                          ${KlOhlcRollupFields},
                          ${KlAggSumFields}
                   from ${this.getKLineTable(interval)}
                   where ${timeCond}
                             ${this.symbolCondition(symbols)}
                   group by time
                   order by time ${timeSort}
                   limit ${getLimit(limit)}`;

      kls = await this.queryBySql(sql);
    } else {
      const sql = `select time,
                          ${KlNumericFieldsStr}
                   from ${this.getKLineTable(interval)}
                   where ${this.timeCondition(params)}
                             ${this.symbolCondition(symbols)}
                   order by time ${timeSort}, symbol, ex
                   limit ${getLimit(limit)}`;

      kls = await this.queryBySql(sql);
    }
    if (timeSort === 'desc') {
      kls.reverse();
    }
    kls.forEach((k: Kline2) => {
      k.ts = k.time.getTime();
      for (const f of KlNumericFields) {
        if (k[f] != null) {
          k[f] = +k[f];
        }
      }
    });
    return kls;
  }
}
