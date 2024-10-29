import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClassSerializerInterceptor as CSI } from '@nestjs/common/serializer/class-serializer.interceptor';
import { ExchangeConfig } from '@/db/models/exchange-config';

@Controller('exchanges')
@UseInterceptors(CSI)
export class ExchangeController {
  constructor() {}

  @Get()
  getAll(): Promise<ExchangeConfig[]> {
    return ExchangeConfig.find({
      order: {
        displayOrder: 'ASC',
      },
    });
  }
}
