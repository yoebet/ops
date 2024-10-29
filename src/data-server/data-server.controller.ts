import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ClassSerializerInterceptor as CSI } from '@nestjs/common/serializer/class-serializer.interceptor';
import { MetadataService } from '@/data-server/services/metadata.service';
import { DataQueryService } from '@/data-server/services/data-query.service';
import { AggField, DataRequest, MetaDataRequest } from '@/data-server/commands';
import { OflowDataType } from '@/data-server/constants';
import { SymbolService } from '@/common-services/symbol.service';

@UseInterceptors(CSI)
@Controller('/opsd')
export class DataServerController {
  constructor(
    private symbolService: SymbolService,
    private metadataService: MetadataService,
    private marketDataService: DataQueryService,
  ) {}

  @Get()
  index(): string {
    return 'ok';
  }

  @Post('symbols/reload')
  async reloadSymbols() {
    await this.symbolService.reload();
    return 'ok';
  }

  // /oflow/meta/exchanges
  @Get('meta/:type')
  getMetadata(
    @Param('type') type: string,
    @Query() params: any,
  ): Promise<any[]> {
    const req: MetaDataRequest = {
      reqId: params.reqId,
      type: type as any,
      params,
    };
    return this.metadataService.getMetaData(req);
  }

  // /data/kline/okx/BTC-USDT/1m
  @Get('data/:type/:ex/:symbol/:interval')
  fetchData(
    @Param('type') type: string,
    @Param('ex') ex: string,
    @Param('symbol') symbol: string,
    @Param('interval') interval: string,
    @Query() params: any,
  ): Promise<any[]> {
    let aggArray: AggField[] = undefined;
    if (params.aggFields) {
      aggArray = JSON.parse(params.aggFields);
    }
    let groupArray: string[] = undefined;
    if (params.groupFields) {
      groupArray = JSON.parse(params.groupFields);
    }
    const req = {
      reqId: params.reqId,
      type: type as OflowDataType,
      params: {
        ex,
        symbol,
        interval,
        timeFrom: params.timeFrom,
        timeTo: params.timeTo,
        aggFields: aggArray,
        groupFields: groupArray,
      },
    } as DataRequest;
    return this.marketDataService.fetchData(req);
  }

  // /data/kline
  @Post('data/:type')
  fetchDataByPost(
    @Param('type') type: string,
    @Body() params: any,
  ): Promise<any[]> {
    const req = {
      reqId: params.reqId,
      type: type as OflowDataType,
      params: params,
    } as DataRequest;
    return this.marketDataService.fetchData(req);
  }
}
