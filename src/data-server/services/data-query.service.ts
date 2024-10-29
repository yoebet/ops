import { Injectable } from '@nestjs/common';
import {
  AggField,
  AggregateRequestParams,
  DataRequest,
  DataRequestParams,
  ExSymbolScope,
  KlineAggregateParams,
  KlineDataScope,
  KlineQueryParams,
  LiveDataRequest,
} from '../commands';
import { OFlowKline } from '@/data-service/models/klines';
import { AppLogger } from '@/common/app-logger';
import { tsToISO8601 } from '@/common/utils/utils';
import { OflowDataType } from '@/data-server/constants';
import { toDbField } from '@/db/field-map';
import { KlineDataService } from '@/data-service/kline-data.service';

@Injectable()
export class DataQueryService {
  constructor(
    private marketDataService: KlineDataService,
    private logger: AppLogger,
  ) {
    logger.setContext('data-query');
  }

  async getLatest(req: LiveDataRequest): Promise<any[]> {
    const { type, floorInv, params } = req;
    if (typeof params['interval'] === 'string') {
      params['interval'] = params['interval'].toLowerCase();
    }
    if (type === 'kline') {
      const kline = await this.fetchLastKLine(params, floorInv);
      return kline ? kline : [];
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
        return f;
      });
      if (!DataQueryService.checkAggParams(aggParams)) {
        return [];
      }
    } else {
      if (!DataQueryService.checkParams(params)) {
        return [];
      }
    }
    const startTS = Date.now();
    switch (type) {
      case OflowDataType.kline:
        if (aggParams) {
          const result = await this.aggregateKLines(
            aggParams as KlineAggregateParams,
          );
          this.logger.debug(
            'fetch耗时: aggregateKLines: ' + (Date.now() - startTS),
          );
          return result;
        } else {
          const result = await this.fetchKLines(params);
          this.logger.debug(
            'fetch耗时: fetchKLines: ' + (Date.now() - startTS),
          );
          return result;
        }
    }
    return [];
  }

  protected async fetchKLines(params: KlineQueryParams): Promise<OFlowKline[]> {
    if (!params.timeTo) {
      params.timeTo = Date.now();
    }
    return await this.marketDataService.queryOFlowKline(params);
  }

  protected async fetchLastKLine(
    params: KlineDataScope,
    floorInv?: string,
  ): Promise<OFlowKline[]> {
    return await this.marketDataService.queryOFlowLastKLine(params, floorInv);
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
    const sql = DataQueryService.makeKlineSql(datasourceName, params);
    if (!sql) {
      return [];
    }

    return await this.marketDataService.queryBySql(sql);
  }

  protected static symbolsCond(params: ExSymbolScope) {
    if (KlineDataService.isEsMultiSymbols(params)) {
      const andArray = params.exSymbols.map((value) => {
        const ss = value.symbols.map((s) => `'${s}'`).join(',');
        return ` (ex='${value.ex}' and symbol in (${ss})) \n`;
      });

      return ` and (${andArray.join(' or ')}) \n`;
    } else {
      return ` and symbol='${params.symbol}' and ex='${params.ex}' \n`;
    }
  }

  static makeKlineSql(
    dataSource: string,
    params: KlineAggregateParams,
  ): string | undefined {
    if (!params.aggFields || params.aggFields.length <= 0) {
      return undefined;
    }
    const groupFieldsCount = params.groupFields ? params.groupFields.length : 0;
    const sqlSelect = 'select \n';
    const cols: string[] = [];

    for (let i = 0; params.groupFields && i < params.groupFields.length; i++) {
      const line = DataQueryService.makeSelectColGroup(params.groupFields[i]);
      if (!line) {
        return undefined;
      }
      cols.push(line);
    }

    for (let i = 0; i < params.aggFields.length; i++) {
      const line = DataQueryService.makeSelectColAgg(params.aggFields[i]);
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
    sqlWhere += this.symbolsCond(params);

    const sqlGroup = DataQueryService.makeGroupString(groupFieldsCount);

    return sqlSelect + sqlCol + sqlFrom + sqlWhere + sqlGroup;
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

  static checkParams(params: DataRequestParams): boolean {
    if (params['interval'] && !this.checkInterval(params['interval'])) {
      return false;
    }
    if (params.baseCoin && !this.checkCoin(params.baseCoin)) {
      return false;
    }
    if (!this.checkNumbers(params.timeFrom, params.timeTo, params.limit)) {
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
