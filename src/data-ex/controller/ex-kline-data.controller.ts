import { Body, Controller, Get, Post } from '@nestjs/common';
import { DateTime } from 'luxon';
import { AppLogger } from '@/common/app-logger';
import { KlineParams2 } from '@/data-service/models/query-params';
import { FtKline } from '@/data-service/models/kline';
import { ListResult } from '@/common/api-result';
import { ExPublicDataService } from '@/data-ex/ex-public-data.service';

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

@Controller('ex-klines')
export class ExKlineDataController {
  constructor(
    private readonly exPublicDataService: ExPublicDataService,
    private readonly logger: AppLogger,
  ) {
    logger.debug('ex-klines');
  }

  @Post('query')
  async query(@Body() params: KlineParams2): Promise<ListResult<FtKline>> {
    if (params.dateFrom) {
      params.tsFrom = parseDate(params.dateFrom);
    }
    if (params.dateTo) {
      params.tsTo = parseDate(params.dateTo);
    }
    const klines = await this.exPublicDataService.fetchKlines(params);
    return ListResult.list(klines);
  }
}
