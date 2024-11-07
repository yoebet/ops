import { Body, Controller, Get, Post } from '@nestjs/common';
import { KlineDataService } from '@/data-service/kline-data.service';
import { AppLogger } from '@/common/app-logger';
import { KlineParams2 } from '@/data-service/models/query-params';
import { FtKline, Kline2 } from '@/data-service/models/kline';
import { ListResult } from '@/common/api-result';
import { DateTime } from 'luxon';

function parseDate(dateStr: string): number {
  if (dateStr.includes('T')) {
    return new Date(dateStr).getTime();
  }
  // https://moment.github.io/luxon/#/parsing?id=table-of-tokens
  let pattern = 'yyyy-MM-dd';
  if (dateStr.includes(':')) {
    pattern = `${pattern} HH:mm`;
  }
  return DateTime.fromFormat(dateStr, pattern, {
    zone: 'UTC',
  }).toMillis();
}

@Controller('klines')
export class KlineDataController {
  constructor(
    private readonly klineDataService: KlineDataService,
    private readonly logger: AppLogger,
  ) {
    logger.debug('klines');
  }

  @Post('query')
  async query(@Body() params: KlineParams2): Promise<ListResult<FtKline>> {
    if (params.dateFrom) {
      params.tsFrom = parseDate(params.dateFrom);
    }
    if (params.dateTo) {
      params.tsTo = parseDate(params.dateTo);
    }
    const klines = await this.klineDataService.queryKLines(params);
    klines.forEach((kline: Kline2) => {
      delete kline.time;
    });
    return ListResult.list(klines);
  }
}
