import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClassSerializerInterceptor as CSI } from '@nestjs/common/serializer/class-serializer.interceptor';
import { ExchangeSymbol } from '@/db/models/ex/exchange-symbol';

@Controller('exchange')
@UseInterceptors(CSI)
export class ExchangeController {
  constructor() {}

  @Get('symbols')
  symbols(): Promise<ExchangeSymbol[]> {
    return ExchangeSymbol.find({});
  }
}
