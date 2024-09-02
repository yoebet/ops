import { Injectable } from '@nestjs/common';
import {
  AggField,
  AggregateRequestParams,
  BlockAggregateParams,
  BlockQueryParams,
  DataRequest,
  DataRequestParams,
  ExSymbolScope,
  FPAggregateParams,
  FPDataScope,
  FPQueryParams,
  KlineAggregateParams,
  KlineDataScope,
  KlineQueryParams,
  LiveDataRequest,
  TickerAggregateParams,
  TickerDataScope,
} from '../commands';
import { OFlowFpKline, OFlowKline } from '@/data-service/models/klines';
import { OFlowTicker } from '@/data-service/models/base';
import { AppLogger } from '@/common/app-logger';
import { getTsNow, tsToISO8601 } from '@/common/utils/utils';
import { RtPrice } from '@/data-service/models/realtime';
import { OflowDataType } from '@/oflow-server/constants';
import { toDbField } from '@/db/field-map';
import { BlockTicker } from '@/data-service/models/block-ticker';
import { MarketDataService } from '@/data-service/market-data.service';

@Injectable()
export class OFlowMarketDataService {
  constructor(
    private marketDataService: MarketDataService,
    private logger: AppLogger,
  ) {
    logger.setContext('oflow-market-data');
  }

  async getLatest(req: LiveDataRequest): Promise<any[]> {
    // 查最新一条数据，支持多交易对（req.params.exSymbols）。无数据返回空数组，有数据返回长度为1的数组
    // 如果是ticker，查最新一条交易（返回RtPrice类型）
    // 如果是kline，查最新一个周期（可能还未完成），如果是多交易对，汇总成一条
    // footprint 暂不需实现

    const { type, floorInv, params } = req;
    if (typeof params['interval'] === 'string') {
      params['interval'] = params['interval'].toLowerCase();
    }

    if (type === 'ticker') {
      const ticker = await this.fetchLastTrade(params);
      return ticker ? ticker : [];
    }
    if (type === 'kline') {
      const kline = await this.fetchLastKLine(params, floorInv);
      return kline ? kline : [];
    }
    if (type === 'footprint') {
      const fpKline = await this.fetchLastFPKLine(params, floorInv);
      return fpKline ? fpKline : [];
    }
    return [];
  }

  async fetchData(req: DataRequest): Promise<any[]> {
    const { type, params } = req;
    let aggParams: AggregateRequestParams;
    if (typeof params['interval'] === 'string') {
      params['interval'] = params['interval'].toLowerCase();
    }

    const extraGroups = params['rangeGroup'] || params['timeGroup'];
    if (params['aggFields'] || extraGroups) {
      aggParams = params as AggregateRequestParams;
      if (aggParams.aggFields.length === 0) {
        // 参数错误
        return [];
      }
      aggParams.aggFields = aggParams.aggFields.map((f) => {
        // CompactAggRequestParams
        if (typeof f === 'string') {
          return {
            field: f,
            method: 'sum',
          };
        }
        if (!f.method) {
          f.method = 'sum';
        }
        // switch (f.method.toLowerCase()) {
        //   case 'earliest':
        //     f.method = '"ticker"."first"';
        //     break;
        //   case 'latest':
        //     f.method = '"ticker"."last"';
        //     break;
        //   default:
        //     break;
        // }
        return f;
      });
      if (!OFlowMarketDataService.checkAggParams(aggParams)) {
        return [];
      }
    } else {
      if (!OFlowMarketDataService.checkParams(params)) {
        return [];
      }
    }
    const startTS = getTsNow();
    switch (type) {
      case OflowDataType.kline:
        if (aggParams) {
          const result = await this.aggregateKLines(
            aggParams as KlineAggregateParams,
          );
          this.logger.debug(
            'fetch耗时: aggregateKLines: ' + (getTsNow() - startTS),
          );
          return result;
        } else {
          const result = await this.fetchKLines(params);
          this.logger.debug(
            'fetch耗时: fetchKLines: ' + (getTsNow() - startTS),
          );
          return result;
        }
      case OflowDataType.footprint:
        if (aggParams) {
          const result = await this.aggregateFootprints(
            aggParams as FPAggregateParams,
          );
          this.logger.debug(
            'fetch耗时: aggregateFootprints: ' + (getTsNow() - startTS),
          );
          return result;
        } else {
          const result = await this.fetchFootprints(params);
          this.logger.debug(
            'fetch耗时: fetchFootprints: ' + (getTsNow() - startTS),
          );
          return result;
        }
      case OflowDataType.ticker:
        if (aggParams) {
          const result = await this.aggregateTickers(aggParams);
          this.logger.debug(
            'fetch耗时: aggregateTickers: ' + (getTsNow() - startTS),
          );
          return result;
        } else {
          const result = await this.fetchTickers(params);
          this.logger.debug(
            'fetch耗时: fetchTickers: ' + (getTsNow() - startTS),
          );
          return result;
        }
      case OflowDataType.block:
        if (aggParams) {
          const result = await this.aggregateBlocks(
            aggParams as BlockAggregateParams,
          );
          this.logger.debug(
            'fetch耗时: aggregateBlocks: ' + (getTsNow() - startTS),
          );
          return result;
        } else {
          const result = await this.fetchBlocks(params);
          this.logger.debug(
            'fetch耗时: fetchBlocks: ' + (getTsNow() - startTS),
          );
          return result;
        }
    }
    return [];
  }

  protected async fetchTickers(
    params: DataRequestParams,
  ): Promise<OFlowTicker[]> {
    // ignore params.interval
    const tickers: OFlowTicker[] =
      await this.marketDataService.queryTicker(params);
    return tickers;
  }

  protected async fetchKLines(params: KlineQueryParams): Promise<OFlowKline[]> {
    if (!params.timeTo) {
      params.timeTo = getTsNow();
    }
    return await this.marketDataService.queryOFlowKline(params);
  }

  protected async fetchFootprints(
    params: FPQueryParams,
  ): Promise<OFlowFpKline[]> {
    return await this.marketDataService.queryOFlowFpKline(params);
  }

  protected async fetchBlocks(
    params: BlockQueryParams,
  ): Promise<BlockTicker[]> {
    if (!params.timeTo) {
      params.timeTo = getTsNow();
    }
    return await this.marketDataService.queryOFlowBlockList(params);
  }

  protected async fetchLastTrade(params: TickerDataScope): Promise<RtPrice[]> {
    return await this.marketDataService.queryLastTicker(params);
  }

  protected async fetchLastKLine(
    params: KlineDataScope,
    floorInv?: string,
  ): Promise<OFlowKline[]> {
    return await this.marketDataService.queryOFlowLastKLine(params, floorInv);
  }

  protected async fetchLastFPKLine(
    params: FPDataScope,
    floorInv?: string,
  ): Promise<OFlowFpKline[]> {
    return await this.marketDataService.queryLastFPKLine(params, floorInv);
  }

  protected async aggregateTickers(
    params: TickerAggregateParams,
  ): Promise<any[]> {
    const datasourceName = this.marketDataService.getTradeDatasource();
    if (!datasourceName) {
      return [];
    }

    const sql = OFlowMarketDataService.makeTickerAggSql(datasourceName, params);
    if (!sql) {
      return [];
    }
    return await this.marketDataService.queryBySql(sql);
  }

  protected async aggregateKLines(
    params: KlineAggregateParams,
  ): Promise<any[]> {
    const datasourceName = this.marketDataService.getKLineDatasource(
      params.interval,
    );
    if (!datasourceName) {
      return [];
    }
    const sql = OFlowMarketDataService.makeKlineFpSql(datasourceName, params);
    if (!sql) {
      return [];
    }

    return await this.marketDataService.queryBySql(sql);
  }

  protected async aggregateFootprints(
    params: FPAggregateParams,
  ): Promise<any[]> {
    const datasourceName = this.marketDataService.getFootprintDatasource(
      params.interval,
      params.prl,
    );
    if (!datasourceName) {
      return [];
    }
    const sql = OFlowMarketDataService.makeKlineFpSql(datasourceName, params);
    if (!sql) {
      return [];
    }
    return await this.marketDataService.queryBySql(sql);
  }

  protected async aggregateBlocks(
    params: BlockAggregateParams,
  ): Promise<any[]> {
    const datasourceName = this.marketDataService.getTradeStepDatasource();
    if (!datasourceName) {
      return [];
    }
    const sql = OFlowMarketDataService.makeBlockAggSql(datasourceName, params);
    if (!sql) {
      return [];
    }

    return await this.marketDataService.queryBySql(sql);
  }

  protected static symbolsCond(params: ExSymbolScope) {
    if (MarketDataService.isEsMultiSymbols(params)) {
      const andArray = params.exSymbols.map((value) => {
        const ss = value.symbols.map((s) => `'${s}'`).join(',');
        return ` (ex='${value.ex}' and symbol in (${ss})) \n`;
      });

      return ` and (${andArray.join(' or ')}) \n`;
    } else {
      return ` and symbol='${params.symbol}' and ex='${params.ex}' \n`;
    }
  }

  static makeTickerAggSql(
    dataSource: string,
    params: TickerAggregateParams,
  ): string | undefined {
    if (!params.aggFields || params.aggFields.length <= 0) {
      return undefined;
    }
    let groupFieldsCount = params.groupFields ? params.groupFields.length : 0;
    const sqlSelect = 'select \n';
    const cols: string[] = [];

    for (let i = 0; params.groupFields && i < params.groupFields.length; i++) {
      const line = OFlowMarketDataService.makeSelectColGroup(
        params.groupFields[i],
      );
      if (!line) {
        return undefined;
      }
      cols.push(line);
    }

    if (params.timeGroup) {
      const { method, field, name, ps } = params.timeGroup;
      if (!method) {
        return undefined;
      }
      const fun = method.toUpperCase();
      if (fun != 'FLOOR' && fun != 'CEIL') {
        return undefined;
      }

      if (!ps?.length) {
        return undefined;
      }
      const tsField = toDbField(field) || 'ts';
      const timePart = ps[0].toUpperCase();
      const TPS = [
        'SECOND',
        'MINUTE',
        'HOUR',
        'DAY',
        'WEEK',
        'MONTH',
        //'QUARTER', 不支持
        'YEAR',
      ];
      if (!TPS.includes(timePart)) {
        return undefined;
      }

      let col = '';

      if (fun === 'FLOOR') {
        // select time('1 WEEK',trade_time) as col
        col = ` time('1 ${timePart}',${tsField}) AS "${name}"`;
      } else {
        // select time('1 WEEK',trade_time) + '1 WEEK'::INTERVAL as "col"
        col = ` time('1 ${timePart}',${tsField}) + '1 ${timePart}'::INTERVAL as "${name}"`;
      }
      cols.push(col);

      groupFieldsCount++;
    }

    //  (case when size < 0.5 then 1 when size < 50 then 2 else 3 end) as "sizeRank",
    if (params.rangeGroup) {
      const { field, name, divides } = params.rangeGroup;
      const dbField = toDbField(field);
      if (!dbField) {
        return undefined;
      }
      if (!this.checkFieldName(name)) {
        return undefined;
      }
      if (!divides || divides.length === 0) {
        return undefined;
      }
      let rc = `(CASE `;
      let ci = 1;
      for (const value of divides) {
        rc += `WHEN ${dbField} < ${value} THEN ${ci} `;
        ci++;
      }
      rc += `ELSE ${ci} END) AS "${name}"`;
      cols.push(rc);
      groupFieldsCount++;
    }

    for (let i = 0; i < params.aggFields.length; i++) {
      const line = OFlowMarketDataService.makeSelectColAgg(params.aggFields[i]);
      if (!line) {
        return undefined;
      }
      cols.push(line);
    }
    const sqlCol = cols.join(',\n') + '\n';

    const sqlFrom = `from ${dataSource} \n`;
    const tsColName = 'time';
    let sqlWhere = ` where ${tsColName}>='${tsToISO8601(params.timeFrom)}' \n`;
    if (params.timeTo) {
      sqlWhere += ` and ${tsColName}<'${tsToISO8601(params.timeTo)}' \n`;
    }
    sqlWhere += this.symbolsCond(params);

    const sqlGroup = OFlowMarketDataService.makeGroupString(groupFieldsCount);

    return sqlSelect + sqlCol + sqlFrom + sqlWhere + sqlGroup;
  }

  static makeKlineFpSql(
    dataSource: string,
    params: KlineAggregateParams | FPAggregateParams,
  ): string | undefined {
    if (!params.aggFields || params.aggFields.length <= 0) {
      return undefined;
    }
    const groupFieldsCount = params.groupFields ? params.groupFields.length : 0;
    const sqlSelect = 'select \n';
    const cols: string[] = [];

    for (let i = 0; params.groupFields && i < params.groupFields.length; i++) {
      const line = OFlowMarketDataService.makeSelectColGroup(
        params.groupFields[i],
      );
      if (!line) {
        return undefined;
      }
      cols.push(line);
    }

    for (let i = 0; i < params.aggFields.length; i++) {
      const line = OFlowMarketDataService.makeSelectColAgg(params.aggFields[i]);
      if (!line) {
        return undefined;
      }
      cols.push(line);
    }
    const sqlCol = cols.join(',\n') + '\n';

    const sqlFrom = `from ${dataSource} \n`;
    const tsColName = 'time';
    let sqlWhere = ` where ${tsColName}>='${tsToISO8601(params.timeFrom)}' \n`;
    if (params.timeTo) {
      sqlWhere += ` and ${tsColName}<'${tsToISO8601(params.timeTo)}' \n`;
    }

    if (params.interval) {
      sqlWhere += ` and "interval"='${params.interval}' \n`;
    }
    if (params['prl']) {
      sqlWhere += ` and "prl"=${params['prl']} \n`;
    }
    sqlWhere += this.symbolsCond(params);

    const sqlGroup = OFlowMarketDataService.makeGroupString(groupFieldsCount);

    return sqlSelect + sqlCol + sqlFrom + sqlWhere + sqlGroup;
  }

  static makeBlockAggSql(
    dataSource: string,
    params: BlockAggregateParams,
  ): string | undefined {
    const { aggFields, groupFields, rangeGroup, timeFrom, timeTo } = params;
    if (!aggFields || aggFields.length <= 0) {
      return undefined;
    }
    let groupFieldsCount = groupFields ? groupFields.length : 0;
    const sqlSelect = 'select \n';
    const cols: string[] = [];

    for (let i = 0; groupFields && i < groupFields.length; i++) {
      const line = OFlowMarketDataService.makeSelectColGroup(groupFields[i]);
      if (!line) {
        return undefined;
      }
      cols.push(line);
    }
    //  (case when size < 0.5 then 1 when size < 50 then 2 else 3 end) as "sizeRank",
    if (rangeGroup) {
      const { field, name, divides } = rangeGroup;
      const dbField = toDbField(field);
      if (!dbField) {
        return undefined;
      }
      if (!this.checkFieldName(name)) {
        return undefined;
      }
      if (!divides || divides.length === 0) {
        return undefined;
      }
      let rc = `(CASE `;
      let ci = 1;
      for (const value of divides) {
        rc += `WHEN ${dbField} < ${value} THEN ${ci} `;
        ci++;
      }
      rc += `ELSE ${ci} END) AS "${name}"`;
      cols.push(rc);
      groupFieldsCount++;
    }

    for (let i = 0; i < aggFields.length; i++) {
      const line = OFlowMarketDataService.makeSelectColAgg(aggFields[i]);
      if (!line) {
        return undefined;
      }
      cols.push(line);
    }
    const sqlCol = cols.join(',\n') + '\n';

    const sqlFrom = `from ${dataSource} \n`;
    const tsColName = 'time';
    let sqlWhere = ` where ${tsColName} >= '${tsToISO8601(timeFrom)}' \n`;
    if (timeTo) {
      sqlWhere += ` and ${tsColName} < '${tsToISO8601(timeTo)}' \n`;
    }

    sqlWhere += ` and "group_type" = '${params.type}' \n`;
    sqlWhere += this.symbolsCond(params);

    const sqlGroup = OFlowMarketDataService.makeGroupString(groupFieldsCount);
    const sqlOrder = OFlowMarketDataService.makeOrderString(groupFieldsCount);

    return sqlSelect + sqlCol + sqlFrom + sqlWhere + sqlGroup + sqlOrder;
  }

  private static makeSelectColGroup(colString: string): string | undefined {
    if (!toDbField(colString)) {
      return undefined;
    }
    const colName = toDbField(colString);
    return ` ${colName} as "${colString}" `;
  }

  private static makeSelectColAgg(arg: AggField): string | undefined {
    if (!toDbField(arg.field)) {
      return undefined;
    }
    const colName = toDbField(arg.field);
    const alias = arg.name || arg.field;

    if (
      [
        'open',
        'high',
        'low',
        'close',
        'open_time',
        'high_time',
        'low_time',
        'close_time',
        'volume',
        'vwap',
      ].includes(colName.toLowerCase())
    ) {
      return ` ${colName}(rollup(ohlcv)) as ${colName}`;
    }

    return ` ${arg.method}(${colName}) as "${alias}"`;
  }

  private static makeGroupString(groupFieldsCount: number): string | undefined {
    if (!groupFieldsCount || groupFieldsCount <= 0) {
      return '';
    }
    let line = 'group by ';
    for (let i = 0; i < groupFieldsCount; i++) {
      line += i + 1;
      if (i < groupFieldsCount - 1) {
        line += ',';
      }
    }
    line += '\n';
    return line;
  }

  private static makeOrderString(groupFieldsCount: number): string | undefined {
    if (!groupFieldsCount || groupFieldsCount <= 0) {
      return '';
    }
    let line = 'order by ';
    for (let i = 0; i < groupFieldsCount; i++) {
      line += i + 1;
      if (i < groupFieldsCount - 1) {
        line += ',';
      }
    }
    line += '\n';
    return line;
  }

  static checkParams(params: DataRequestParams): boolean {
    if (params['interval'] && !this.checkInterval(params['interval'])) {
      return false;
    }
    if (params.baseCoin && !this.checkCoin(params.baseCoin)) {
      return false;
    }
    if (
      !this.checkNumbers(
        params['prl'],
        params.timeFrom,
        params.timeTo,
        params.limit,
      )
    ) {
      return false;
    }
    if (params.exSymbols) {
      if (!params.exSymbols.length || !params.exSymbols[0].symbols.length) {
        return false;
      }
      for (const es of params.exSymbols) {
        if (!this.checkExCode(es.ex)) {
          return false;
        }
        for (const s of es.symbols) {
          if (!this.checkSymbol(s)) {
            return false;
          }
        }
      }
    } else {
      if (!this.checkExCode(params.ex) || !this.checkSymbol(params.symbol)) {
        return false;
      }
    }
    return true;
  }

  static checkAggParams(params: AggregateRequestParams): boolean {
    for (const aggField of params.aggFields) {
      for (const val of Object.values(aggField)) {
        if (!this.checkFieldName(val)) {
          return false;
        }
      }
    }
    if (params.groupFields) {
      for (const groupName of params.groupFields) {
        if (!this.checkFieldName(groupName)) {
          return false;
        }
      }
    }
    return this.checkParams(params);
  }

  static checkNumbers(...ns: number[]) {
    for (const n of ns) {
      if (n != null && typeof n !== 'number') {
        return false;
      }
    }
    return true;
  }

  static checkFieldName(para: string): boolean {
    return /^[a-zA-z0-9-_"./]+$/.test(para);
  }

  static checkExCode(para: string): boolean {
    return /^[a-zA-z0-9-]+$/.test(para);
  }

  static checkSymbol(para: string): boolean {
    return /^[a-zA-z0-9-/]+$/.test(para);
  }

  static checkCoin(para: string): boolean {
    return /^[a-zA-Z0-9]+$/.test(para);
  }

  static checkInterval(para: string): boolean {
    return /^[1-9][0-9]?[smhdwoy]$/.test(para);
  }
}
