import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClassSerializerInterceptor as CSI } from '@nestjs/common/serializer/class-serializer.interceptor';
import { ListResult } from '@/common/api-result';
import { Coin } from '@/db/models/ex/coin';

@Controller('sys/coins')
@UseInterceptors(CSI)
export class ExchangeCoinsController {
  constructor() {}

  @Get('')
  async coins(): Promise<ListResult<Coin>> {
    const es = await Coin.find({});
    return ListResult.list(es);
  }
}
