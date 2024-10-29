import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_SCHEMA } from '@/env';
import { AppLogger } from '@/common/app-logger';
import { tsToISO8601 } from '@/common/utils/utils';
import { Kline } from '@/db/models-data/kline';
import {
  ExSymbolScope,
  KlineDataScope,
  KlineQueryParams,
} from '@/data-server/commands';
import { OFlowKline } from '@/data-service/models/klines';
import { RtKline } from '@/data-service/models/realtime';
import { ES } from '@/db/models-data/base';

export function getLimit(limit?: number): number {
  return typeof limit === 'number' ? Math.min(limit, 100_000) : 1000;
}

const KlAggFields = ` tds,size,amount,bc,bs,ba,sc,ss,sa`;

const KlAggSumFields = `  sum(tds) as tds,
  sum(size) as size,
  sum(amount) as amount,
  sum(bc) as bc,
  sum(bs) as bs,
  sum(ba) as ba,
  sum(sc) as sc,
  sum(ss) as ss,
  sum(sa) as sa `;

const KlOhlcFields = ` open(ohlcv),
  high(ohlcv),
  low(ohlcv),
  close(ohlcv)`;

const KlOhlcRollupFields = `  open(rollup(ohlcv)),
  high(rollup(ohlcv)),
  low(rollup(ohlcv)),
  close(rollup(ohlcv))`;

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
      bc=EXCLUDED.bc,
      bs=EXCLUDED.bs,
      ba=EXCLUDED.ba,
      sc=EXCLUDED.sc,
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
 ${t.tds},${t.size},${t.amount},${t.bc},${t.bs},${t.ba},${t.sc},${t.ss},${t.sa},
 ${t.open},${t.high},${t.low},${t.close},${t.p_ch},${t.p_avg},${t.p_cp},${t.p_ap}
 )`,
      )
      .join(',\n');

    const sql = `INSERT INTO ${this.getKLineDatasource(interval)}
                 ("time", ex, market, symbol, base, quote, "interval",
                  tds, "size", amount, bc, bs, ba, sc, ss, sa,
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

  getKLineDatasource(interval: string): string {
    return `${DB_SCHEMA}.kline_${interval}`;
  }

  private isMultiSymbols(params: ES[]): boolean {
    return params && params.length !== 1;
  }

  protected timeCondition(parameter: {
    tsFrom: number;
    tsTo?: number;
    noLive?: boolean;
    timeInterval?: string;
  }) {
    const { tsFrom, tsTo, timeInterval, noLive } = parameter;
    const timeTo = tsTo || Date.now() + 1000;
    const fCond = `time >= '${tsToISO8601(tsFrom)}'`;
    const tCond = tsTo ? `and time < '${tsToISO8601(timeTo)}'` : '';
    if (noLive && timeInterval) {
      return `${fCond} ${tCond}
     and time < time_bucket('${timeInterval}'::interval, now())`;
    }
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
    timeInterval: string;
    limit?: number;
    noLive?: boolean;
  }): Promise<Kline[]> {
    if (!parameter.limit) {
      parameter.limit = 10000;
    }
    const { symbols, timeInterval } = parameter;

    if (this.isMultiSymbols(symbols) && parameter.zipSymbols) {
      const sql = `select time,
                          'symbol'          as symbol,
                          'ex'              as ex,
                          'market'          as market,
                          'base'            as base,
                          'quote'           as quote,
                          '${timeInterval}' as interval,
                          ${KlOhlcRollupFields},
                          ${KlAggSumFields}
                   from ${this.getKLineDatasource(timeInterval)}
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
                 from ${this.getKLineDatasource(timeInterval)}
                 where ${this.timeCondition(parameter)}
                           ${this.symbolCondition(symbols)}
                 order by time, symbol, ex
                 limit ${getLimit(parameter.limit)}`;

    return this.queryBySql(sql);
  }

  async queryLastKLine(parameter: {
    symbols: ES[];
    zipSymbols?: boolean;
    timeInterval: string;
    floorInv?: string;
  }): Promise<Kline[]> {
    const { symbols, timeInterval, floorInv } = parameter;

    let table: string;
    let timeCond: string;

    if (floorInv) {
      table = this.getKLineDatasource(floorInv);
      timeCond = `time >= time_bucket('${timeInterval}'::interval, now())
  and time < time_bucket('${floorInv}'::interval, now())`;
    } else {
      table = this.getKLineDatasource(timeInterval);
      timeCond = `time = time_bucket('${timeInterval}'::interval, now())`;
    }

    if (
      floorInv ||
      (this.isMultiSymbols(parameter.symbols) && parameter.zipSymbols)
    ) {
      const sql = `select time_bucket('${timeInterval}'::interval, now()) as time,
                          'symbol'                                        as symbol,
                          'ex'                                            as ex,
                          '${timeInterval}'                               as interval,
                          ${KlOhlcRollupFields},
                          ${KlAggSumFields}
                   from ${table}
                   where ${timeCond}
                             ${this.symbolCondition(symbols)}
                   group by 1`;
      return this.queryBySql(sql);
    } else {
      const sql = `select time_bucket('${timeInterval}'::interval, now()) as time,
                          symbol,
                          ex,
                          '${timeInterval}'                               as interval,
                          ${KlOhlcRollupFields},
                          ${KlAggSumFields}
                   from ${table}
                   where ${timeCond}
                             ${this.symbolCondition(symbols)}
                   group by 1, 2, 3`;
      return this.queryBySql(sql);
    }
  }

  // OFlow ...

  static isEsMultiSymbols(params: ExSymbolScope): boolean {
    const es = params.exSymbols;
    return es && es.length > 0 && es[0].symbols && es[0].symbols.length > 0;
  }

  private toQuerySymbols(params: ExSymbolScope): ES[] {
    const result: ES[] = [];
    if (KlineDataService.isEsMultiSymbols(params)) {
      for (const es of params.exSymbols) {
        for (const symbol of es.symbols) {
          result.push({ symbol: symbol, ex: es.ex });
        }
      }
    } else {
      result.push({ symbol: params.symbol, ex: params.ex });
    }
    return result;
  }

  async queryOFlowKline(params: KlineQueryParams): Promise<OFlowKline[]> {
    const result = await this.queryKLines({
      tsFrom: params.timeFrom,
      tsTo: params.timeTo,
      limit: params.limit,
      symbols: this.toQuerySymbols(params),
      zipSymbols: true,
      timeInterval: params.interval,
      noLive: true,
    });
    return result.map(this.klineToOFlowKline);
  }

  async queryOFlowLastKLine(
    params: KlineDataScope,
    floorInv?: string,
  ): Promise<OFlowKline[]> {
    const result = await this.queryLastKLine({
      symbols: this.toQuerySymbols(params),
      zipSymbols: true,
      timeInterval: params.interval,
      floorInv: floorInv,
    });
    if (!result || result.length === 0 || !result[0].tds) {
      return [];
    }
    return result.map(this.klineToOFlowKline);
  }

  private klineToOFlowKline(value: Kline): OFlowKline {
    return {
      ts: value.time.getTime(),
      open: +value.open,
      high: +value.high,
      low: +value.low,
      close: +value.close,
      size: +value.size,
      amount: +value.amount,
      bs: +value.bs,
      ba: +value.ba,
      ss: +value.ss,
      sa: +value.sa,
      tds: +value.tds,
    };
  }

  static klineToRtKline(kl: Kline): RtKline {
    return {
      ts: kl.time.getTime(),
      interval: kl.interval,
      ex: kl.ex,
      symbol: kl.symbol,
      amount: +kl.amount,
      ba: +kl.ba,
      bs: +kl.bs,
      close: +kl.close,
      high: +kl.high,
      low: +kl.low,
      open: +kl.open,
      sa: +kl.sa,
      size: +kl.size,
      ss: +kl.ss,
      tds: +kl.tds,
    };
  }
}
