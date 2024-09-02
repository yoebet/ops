import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  And,
  DataSource,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
} from 'typeorm';
import { DB_SCHEMA } from '@/env';
import { AppLogger } from '@/common/app-logger';
import { getTsNow, tsToISO8601, wait } from '@/common/utils/utils';
import { Trade0, Trade1 } from '@/data-service/models/trade1';
import { Footprint, FpKline } from '@/db/models-data/footprint';
import { Kline } from '@/db/models-data/kline';
import { toDbField } from '@/db/field-map';
import { TimeLevel } from '@/db/models/time-level';
import {
  BlockQueryParams,
  ExSymbolScope,
  FPDataScope,
  FPQueryParams,
  KlineDataScope,
  KlineQueryParams,
  TickerDataScope,
  TickerQueryParams,
} from '@/oflow-server/commands';
import { OFlowTicker } from '@/data-service/models/base';
import { OFlowFpKline, OFlowKline } from '@/data-service/models/klines';
import { RtFpKline, RtKline, RtPrice } from '@/data-service/models/realtime';
import { BlockTicker } from '@/data-service/models/block-ticker';
import { Trade } from '@/db/models/trade';
import { TradeIdTime } from '@/db/models/ex-data-task';
import { ES } from '@/db/models-data/base';

export function getLimit(limit?: number): number {
  return typeof limit === 'number' ? Math.min(limit, 100_000) : 1000;
}

const Trade0Fields = ` time,symbol,ex,trade_id,price,size,amount,side,data_id`;

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
export class MarketDataService implements OnModuleInit {
  constructor(
    private logger: AppLogger,
    @InjectDataSource(DB_SCHEMA)
    private dataSource: DataSource,
  ) {
    logger.setContext('market-data');
  }

  async onModuleInit() {}

  async saveTrades(trades: Trade1[]): Promise<number> {
    if (trades.length === 0) {
      return;
    }

    const rows = trades
      .map(
        (t) => `('${t.time.toISOString()}',
 '${t.symbol}','${t.ex}','${t.tradeId}','${t.price}',
 '${t.csize}','${t.size}','${t.amount}','${t.side}','${t.block}')`,
      )
      .join(',\n');

    const sql = `INSERT INTO ${this.getTradeDatasource()}
                 ("time", "symbol", "ex", "trade_id", "price", "csize", "size", "amount", "side", "block")
    VALUES
    ${rows}
 ON CONFLICT
    DO NOTHING
    RETURNING trade_id
    `;

    let retry = true;
    let retryTimes = 0;
    while (retry && retryTimes < 5) {
      try {
        const res = await this.dataSource.query(sql);
        const saved = res.length;
        // if (saved !== trades.length) {
        //   this.logger.debug(`saved: ${saved} (passed: ${trades.length})`);
        // } else {
        //   this.logger.debug(`saved: ${saved}`);
        // }
        return saved;
      } catch (e) {
        this.logger.error(e);
        this.logger.error(`发生异常: 稍后重试...`);
        retryTimes++;
        await wait(500);
      }
    }
    return 0;
  }

  async queryBySql(sql: string): Promise<any> {
    // this.logger.debug(sql);
    return await this.dataSource.query(sql);
  }

  getTradeDatasource(): string {
    return `${DB_SCHEMA}.t_trade`;
  }

  getTradeStepDatasource(): string {
    return `${DB_SCHEMA}.v_trade_step`;
  }

  getBlockListDatasource(): string {
    return `${DB_SCHEMA}.v_trade_block`;
  }

  getKLineDatasource(interval: string): string {
    return `${DB_SCHEMA}.t_kline_${interval}`;
  }

  getFootprintDatasource(interval: string, prl: number): string {
    return `${DB_SCHEMA}.t_fp_${interval}_p${prl}`;
  }

  async findNextTrade(params: {
    ex: string;
    symbol: string;
    tradeTs: number;
    // tradeId?: string;
    withinHours?: number;
  }): Promise<TradeIdTime | null> {
    const { ex, symbol, tradeTs, withinHours } = params;
    const tradeTime = new Date(tradeTs);
    const forwardToTime = new Date(
      tradeTs + (withinHours || 12) * 60 * 60 * 1000,
    );
    const trade = await Trade.findOne({
      select: ['tradeId', 'time'],
      where: {
        ex,
        symbol,
        time: And(MoreThan(tradeTime), LessThanOrEqual(forwardToTime)),
      },
      order: { time: 'asc' },
    });
    if (trade)
      return {
        tradeId: trade.tradeId,
        tradeTs: trade.time.getTime(),
      };
    return undefined;
  }

  async findPreviousTrade(params: {
    ex: string;
    symbol: string;
    tradeTs: number;
    withinHours?: number;
  }): Promise<TradeIdTime | null> {
    const { ex, symbol, tradeTs, withinHours } = params;
    const tradeTime = new Date(tradeTs);
    const backToTime = new Date(tradeTs - (withinHours || 12) * 60 * 60 * 1000);
    const trade = await Trade.findOne({
      select: ['tradeId', 'time'],
      where: {
        ex,
        symbol,
        time: And(LessThan(tradeTime), MoreThanOrEqual(backToTime)),
      },
      order: { time: 'desc' },
    });
    if (trade)
      return {
        tradeId: trade.tradeId,
        tradeTs: trade.time.getTime(),
      };
    return undefined;
  }

  async queryTrades(parameter: {
    tsFrom: number;
    tsTo?: number;
    symbols: ES[];
    dataIdFrom?: number;
    limit?: number;
    slices?: {
      field: string;
      range: [undefined | number, undefined | number];
    }[];
  }): Promise<Trade0[]> {
    if (!parameter.tsTo) {
      parameter.tsTo = getTsNow() + 5000;
    }

    let dataIdCond = '';
    if (parameter.dataIdFrom) {
      dataIdCond = ` and data_id > ${parameter.dataIdFrom} \n`;
    }

    let slicesCond = '';
    if (parameter.slices && parameter.slices.length > 0) {
      for (const {
        field,
        range: [lb, ub],
      } of parameter.slices) {
        const dbField = toDbField(field);
        if (!dbField) {
          this.logger.warn(`unknown api field: ${field}`);
          continue;
        }
        if (typeof lb === 'number') {
          slicesCond += ` and ${dbField} >= ${lb}\n`;
        }
        if (typeof ub === 'number') {
          slicesCond += ` and ${dbField} < ${ub}\n`;
        }
      }
    }

    const sql = `select ${Trade0Fields}
                 from ${this.getTradeDatasource()}
                 where ${this.timeCondition(parameter)}
                           ${this.symbolCondition(parameter.symbols)} ${dataIdCond} ${slicesCond}
                 order by data_id
                 limit ${getLimit(parameter.limit)}`;

    return this.queryBySql(sql);
  }

  async queryLastTrade(parameter: { symbols: ES[] }): Promise<Trade0[]> {
    const symbolCond = this.symbolCondition(parameter.symbols);

    const sql = `select ${Trade0Fields}
                 from ${this.getTradeDatasource()}
                 where time > now() - '1h'::interval
                     ${symbolCond}
                 order by time desc
                 limit 1`;

    return this.queryBySql(sql);
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
      let sql = `select time,
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

    let sql = `select ${KlNonAggFields},
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

  async queryLastFootPrint(parameter: {
    symbols: ES[];
    zipSymbols?: boolean;
    timeInterval: string;
    prl: number;
    floorInv?: string;
    ts: number;
  }): Promise<Footprint[]> {
    const { symbols, timeInterval, floorInv, ts, prl } = parameter;

    const kt = `time_bucket('${timeInterval}'::interval, to_timestamp(${
      ts / 1000
    }))`;

    if (floorInv) {
      const tl = await TimeLevel.findOneBy({ interval: floorInv });
      if (tl) {
        const sourcePrl = Math.min(prl, tl.prlTo);
        const table = this.getFootprintDatasource(floorInv, sourcePrl);

        const fields = `${kt} as time,
  '${timeInterval}' as interval,
  pt,
  ${prl} as prl,
  div(pl, pt * ${prl}) * (pt * ${prl}) as pl,
  div(pl, pt * ${prl}) * (pt * ${prl}) + (pt * ${prl}) as pu`;

        if (this.isMultiSymbols(parameter.symbols) && parameter.zipSymbols) {
          const sql = `
              SELECT 'symbol' as symbol,
                     'ex'     as ex,
                     ${fields},
                     ${KlAggSumFields}
              from ${table}
              where time >= ${kt}
                and time < time_bucket('${floorInv}'::interval, now())
                  ${this.symbolCondition(symbols)}
              group by pl, pu, pt
              order by time, pl`;

          return this.queryBySql(sql);
        } else {
          const sql = `
              SELECT symbol,
                     ex,
                     ${fields},
                     ${KlAggSumFields}
              from ${table}
              where time >= ${kt}
                and time < time_bucket('${floorInv}'::interval, now())
                  ${this.symbolCondition(symbols)}
              group by pl, pu, pt, symbol, ex
              order by time, pl`;

          return this.queryBySql(sql);
        }
      }
    }

    const table = this.getFootprintDatasource(timeInterval, prl);

    if (
      floorInv ||
      (this.isMultiSymbols(parameter.symbols) && parameter.zipSymbols)
    ) {
      const sql = `
          SELECT time,
                 'symbol'          as symbol,
                 'ex'              as ex,
                 '${timeInterval}' as interval,
                 ${prl}            as prl,
                 pt,
                 pl,
                 pu,
                 ${KlAggSumFields}
          from ${table}
          where time = ${kt}
              ${this.symbolCondition(symbols)}
          group by time, pl, pu, pt
          order by time, pl`;

      return this.queryBySql(sql);
    }

    const sql = `
        SELECT time,
               symbol,
               ex,
               interval,
               pt,
               prl,
               pl,
               pu,
               ${KlAggFields}
        from ${table}
        where time = ${kt}
            ${this.symbolCondition(symbols)}
        order by time, pl`;

    return this.queryBySql(sql);
  }

  async queryBlockList(parameter: {
    tsFrom: number;
    tsTo?: number;
    symbols: ES[];
    limit?: number;
    // ticker query
    slices?: {
      field: string;
      range: [undefined | number, undefined | number];
    }[];
  }): Promise<Trade0[]> {
    if (!parameter.tsTo) {
      parameter.tsTo = getTsNow() + 5000;
    }

    let slicesWhere = '';
    if (parameter.slices && parameter.slices.length > 0) {
      for (const {
        field,
        range: [lb, ub],
      } of parameter.slices) {
        const dbField = toDbField(field);
        if (!dbField) {
          this.logger.warn(`unknown api field: ${field}`);
          continue;
        }
        if (typeof lb === 'number') {
          slicesWhere += ` and ${dbField} >= ${lb}\n`;
        }
        if (typeof ub === 'number') {
          slicesWhere += ` and ${dbField} < ${ub}\n`;
        }
      }
    }

    const sql = `select ${Trade0Fields}
                 from ${this.getBlockListDatasource()}
                 where ${this.timeCondition(parameter)}
                           ${this.symbolCondition(parameter.symbols)} ${slicesWhere}
                 order by time desc
                 limit ${getLimit(parameter.limit)}`;

    return this.queryBySql(sql);
  }

  async queryFootprint(parameter: {
    tsFrom: number;
    tsTo?: number;
    symbols: ES[];
    zipSymbols?: boolean;
    timeInterval: string;
    prl: number;
    limit?: number;
    noLive?: boolean;
  }): Promise<Footprint[]> {
    const { prl, timeInterval, symbols } = parameter;
    if (!parameter.limit) {
      parameter.limit = 5000;
    }

    const table = this.getFootprintDatasource(timeInterval, prl);
    const timeCond = this.timeCondition(parameter);

    if (this.isMultiSymbols(parameter.symbols) && parameter.zipSymbols) {
      let sql = `select time,
                        'symbol'          as symbol,
                        'ex'              as ex,
                        '${timeInterval}' as interval,
                        0                 as pt,
                        ${prl}            as prl,
                        pl,
                        pu,
                        ${KlAggSumFields}
                 from ${table}
                 where ${timeCond}
                           ${this.symbolCondition(symbols)}
                 group by time, pl, pu
                 order by time, pl
                 limit ${getLimit(parameter.limit)}`;

      return this.queryBySql(sql);
    }

    let sql = `select ${KlNonAggFields},
                      pt,
                      prl,
                      pl,
                      pu,
                      ${KlAggFields}
               from ${table}
               where ${timeCond}
                         ${this.symbolCondition(symbols)}
               order by time, pl
               limit ${getLimit(parameter.limit)}`;

    return this.queryBySql(sql);
  }

  async queryFpKLine(parameter: {
    tsFrom: number;
    tsTo?: number;
    symbols: ES[];
    zipSymbols?: boolean;
    timeInterval: string;
    prl: number;
    limit?: number;
    klines?: Kline[];
    noLive?: boolean;
  }): Promise<FpKline[]> {
    let klines = parameter.klines;
    if (klines) {
      this.logger.debug(`use passed Klines: ${klines.length}`);
    } else {
      klines = await this.queryKLines(parameter);
    }
    if (!klines || klines.length === 0) {
      return [];
    }
    this.logger.debug(`got kline: ${klines.length}`);
    const fps = await this.queryFootprint({ ...parameter, limit: 10_000 });
    if (!fps || fps.length === 0) {
      return [];
    }
    this.logger.debug(`got footprint: ${fps.length}`);

    const fpkls: FpKline[] = [];
    const klineMap = new Map<string, FpKline>();
    for (const kLine of klines) {
      const mapKey = `${kLine.time.getTime()}_${kLine.symbol}_${kLine.ex}`;
      const fpkl: FpKline = {
        ...kLine,
        prl: parameter.prl,
        fps: [],
      };
      fpkls.push(fpkl);
      klineMap.set(mapKey, fpkl);
    }
    for (const footprint of fps) {
      const mapKey = `${footprint.time.getTime()}_${footprint.symbol}_${
        footprint.ex
      }`;
      if (klineMap.has(mapKey)) {
        klineMap.get(mapKey).fps.push(footprint);
      }
    }

    return fpkls;
  }

  // OFlow ...

  static isEsMultiSymbols(params: ExSymbolScope): boolean {
    const es = params.exSymbols;
    return es && es.length > 0 && es[0].symbols && es[0].symbols.length > 0;
  }

  private toQuerySymbols(params: ExSymbolScope): ES[] {
    const result: ES[] = [];
    if (MarketDataService.isEsMultiSymbols(params)) {
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

  async queryTicker(params: TickerQueryParams): Promise<OFlowTicker[]> {
    const result = await this.queryTrades({
      tsFrom: params.timeFrom,
      tsTo: params.timeTo,
      limit: params.limit,
      symbols: [{ symbol: params.symbol, ex: params.ex }],
      slices: params.slices,
    });
    return result.map((value: Trade0): OFlowTicker => {
      return {
        ts: value.time.getTime(),
        size: +value.size,
        amount: +value.amount,
        price: +value.price,
        tradeId: value.tradeId,
        side: value.side,
      };
    });
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

  async queryLastFPKLine(
    params: FPDataScope,
    floorInv?: string,
  ): Promise<OFlowFpKline[]> {
    const kLines = await this.queryLastKLine({
      symbols: this.toQuerySymbols(params),
      zipSymbols: true,
      timeInterval: params.interval,
      floorInv: floorInv,
    });
    if (!kLines || kLines.length === 0 || !kLines[0].tds) {
      return [];
    }
    const kline = kLines[0];
    const fp = await this.queryLastFootPrint({
      symbols: this.toQuerySymbols(params),
      zipSymbols: true,
      timeInterval: params.interval,
      prl: params.prl,
      floorInv: floorInv,
      ts: kline.time.getTime(),
    });
    if (!fp || fp.length <= 0) {
      return [];
    }
    const klineFP: FpKline = {
      ...kline,
      prl: params.prl,
      fps: [],
    };
    for (const footprint of fp) {
      klineFP.fps.push(footprint);
    }

    // const pt = +symbolConfig.priceTickStr;
    return [this.toOFlowFpKline(klineFP)];
  }

  async queryLastTicker(params: TickerDataScope): Promise<RtPrice[]> {
    const result = await this.queryLastTrade({
      symbols: this.toQuerySymbols(params),
    });
    if (!result || result.length <= 0) {
      return [];
    }
    return result.map((value: Trade0): RtPrice => {
      return {
        ts: value.time.getTime(),
        ex: value.ex,
        symbol: value.symbol,
        price: +value.price,
      };
    });
  }

  async queryOFlowBlockList(params: BlockQueryParams): Promise<BlockTicker[]> {
    const trades = await this.queryBlockList({
      tsFrom: params.timeFrom,
      tsTo: params.timeTo,
      symbols: this.toQuerySymbols(params),
      limit: params.limit,
      slices: params.slices,
    });
    return trades.map((t) => {
      const ticker: BlockTicker = {
        trade_time: t.time.toISOString(),
        ex_code: t.ex,
        symbol: t.symbol,
        trade_id: t.tradeId,
        trade_side: t.side,
        trade_price: '' + t.price,
        trade_size: '' + t.size,
        trade_amount: '' + t.amount,
      };
      return ticker;
    });
  }

  async queryOFlowFpKline(params: FPQueryParams): Promise<OFlowFpKline[]> {
    const result = await this.queryFpKLine({
      tsFrom: params.timeFrom,
      tsTo: params.timeTo,
      limit: params.limit,
      symbols: this.toQuerySymbols(params),
      zipSymbols: true,
      timeInterval: params.interval,
      prl: params.prl,
      noLive: true,
    });

    if (!result) {
      return [];
    }

    return result.map(this.toOFlowFpKline);
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

  private toOFlowFpKline(value: FpKline): OFlowFpKline {
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
      prl: +value.prl,
      fps: value.fps.map((v) => {
        return {
          bs: +v.bs,
          ba: +v.ba,
          ss: +v.ss,
          sa: +v.sa,
          tds: +v.tds,
          prl: +v.prl,
          pl: +v.pl,
          pu: +v.pu,
        };
      }),
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

  static fpKlineToRtFpKline(kl: FpKline): RtFpKline {
    const rtKline = MarketDataService.klineToRtKline(kl);
    return {
      ...rtKline,
      prl: +kl.prl,
      fps: kl.fps.map((f) => {
        return {
          ba: +f.ba,
          bs: +f.bs,
          pl: +f.pl,
          pu: +f.pu,
          sa: +f.sa,
          ss: +f.ss,
          tds: +f.tds,
          prl: +f.prl,
        };
      }),
    };
  }
}
