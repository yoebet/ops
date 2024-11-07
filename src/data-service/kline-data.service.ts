import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_SCHEMA } from '@/env';
import { AppLogger } from '@/common/app-logger';
import { tsToISO8601 } from '@/common/utils/utils';
import { Kline } from '@/db/models-data/kline';
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
}
