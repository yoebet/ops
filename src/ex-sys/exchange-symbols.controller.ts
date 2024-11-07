import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClassSerializerInterceptor as CSI } from '@nestjs/common/serializer/class-serializer.interceptor';
import { ExchangeSymbol } from '@/db/models/ex/exchange-symbol';
import { ListResult } from '@/common/api-result';

@Controller('sys/exchange-symbols')
@UseInterceptors(CSI)
export class ExchangeSymbolsController {
  constructor() {}

  @Get('')
  async symbols(): Promise<ListResult<ExchangeSymbol>> {
    const es = await ExchangeSymbol.find({});
    return ListResult.list(es);
  }
}
