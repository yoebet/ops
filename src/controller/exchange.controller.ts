import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClassSerializerInterceptor as CSI } from '@nestjs/common/serializer/class-serializer.interceptor';
import { ExchangeConfigService } from '@/common-services/exchange-config.service';
import { ExchangeConfig } from '@/db/models/exchange-config';

@Controller('exchanges')
@UseInterceptors(CSI)
export class ExchangeController {
  constructor(private exConfigService: ExchangeConfigService) {}

  @Get()
  getAll(): Promise<ExchangeConfig[]> {
    return this.exConfigService.getExchangeConfigs();
  }
}
