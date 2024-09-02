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
import { OflowMetadataService } from '@/oflow-server/services/oflow-metadata.service';
import { OFlowMarketDataService } from '@/oflow-server/services/oflow-market-data.service';
import {
  AggField,
  DataRequest,
  MetaDataRequest,
  TickerDataRequest,
} from '@/oflow-server/commands';
import { OflowDataType } from '@/oflow-server/constants';

@UseInterceptors(CSI)
@Controller('/oflow')
export class OflowDataController {
  constructor(
    private metadataService: OflowMetadataService,
    private marketDataService: OFlowMarketDataService,
  ) {}

  @Get()
  index(): string {
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

  // /oflow/data/ticker/okx/BTC-USDT
  @Get('data/ticker/:ex/:symbol')
  fetchTickers(
    @Param('ex') ex: string,
    @Param('symbol') symbol: string,
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
    const req: TickerDataRequest = {
      reqId: params.reqId,
      type: OflowDataType.ticker,
      params: {
        ex,
        symbol,
        timeFrom: params.timeFrom,
        timeTo: params.timeTo,
        aggFields: aggArray,
        groupFields: groupArray,
      },
    };
    return this.marketDataService.fetchData(req);
  }

  // /oflow/data/kline/okx/BTC-USDT/1m
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
        prl: params.prl,
        aggFields: aggArray,
        groupFields: groupArray,
      },
    } as DataRequest;
    return this.marketDataService.fetchData(req);
  }

  // /oflow/data/kline
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
