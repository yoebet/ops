import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_SCHEMA } from '@/env';
import { AppLogger } from '@/common/app-logger';
import { tsToISO8601 } from '@/common/utils/utils';
import { ES } from '@/data-service/models/base';
import { Kline } from '@/data-service/models/kline';

export function getLimit(limit?: number): number {
  return typeof limit === 'number' ? Math.min(limit, 100_000) : 1000;
}

const KlAggFields = ` tds,size,amount,bs,ba,ss,sa`;

const KlAggSumFields = `  sum(tds) as tds,
  sum(size) as size,
  sum(amount) as amount,
  sum(bs) as bs,
  sum(ba) as ba,
  sum(ss) as ss,
  sum(sa) as sa `;

const KlOhlcFields = ` open,high,low,close`;

export const KlRollupMap = {
  open: 'first(open, time)',
  high: 'max(high)',
  low: 'max(low)',
  close: 'last(close, time)',
};

const KlOhlcRollupFields = ['open', 'high', 'low', 'close']
  .map((f) => KlRollupMap[f] || `sum(${f})` + ` as ${f}`)
  .join(',');

const KlNonAggFields = ` time,symbol,ex,interval,market,base,quote`;

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
        k.p_avg = k.amount / k.size;
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
    tsFrom: number;
    tsTo?: number;
    interval?: string;
  }) {
    const { tsFrom, tsTo } = parameter;
    const timeTo = tsTo || Date.now() + 1000;
    const fCond = `time >= '${tsToISO8601(tsFrom)}'`;
    const tCond = tsTo ? `and time < '${tsToISO8601(timeTo)}'` : '';
    return `${fCond} ${tCond}`;
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

  async queryKLines(parameter: {
    tsFrom: number;
    tsTo?: number;
    symbols: ES[];
    zipSymbols?: boolean;
    interval: string;
    limit?: number;
  }): Promise<Kline[]> {
    if (!parameter.limit) {
      parameter.limit = 10000;
    }
    const { symbols, interval } = parameter;

    if (this.isMultiSymbols(symbols) && parameter.zipSymbols) {
      const sql = `select time,
                          'symbol'      as symbol,
                          'ex'          as ex,
                          'market'      as market,
                          'base'        as base,
                          'quote'       as quote,
                          '${interval}' as interval,
                          ${KlOhlcRollupFields},
                          ${KlAggSumFields}
                   from ${this.getKLineTable(interval)}
                   where ${this.timeCondition(parameter)}
                             ${this.symbolCondition(symbols)}
                   group by time
                   order by time
                   limit ${getLimit(parameter.limit)}`;

      return this.queryBySql(sql);
    }

    const sql = `select ${KlNonAggFields},
                        ${KlOhlcFields},
                        ${KlAggFields}
                 from ${this.getKLineTable(interval)}
                 where ${this.timeCondition(parameter)}
                           ${this.symbolCondition(symbols)}
                 order by time, symbol, ex
                 limit ${getLimit(parameter.limit)}`;

    return this.queryBySql(sql);
  }
}
