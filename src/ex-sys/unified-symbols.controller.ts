import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClassSerializerInterceptor as CSI } from '@nestjs/common/serializer/class-serializer.interceptor';
import { ListResult } from '@/common/api-result';
import { UnifiedSymbol } from '@/db/models/ex/unified-symbol';

@Controller('sys/unified-symbols')
@UseInterceptors(CSI)
export class UnifiedSymbolsController {
  constructor() {}

  @Get('')
  async unifiedSymbols(): Promise<ListResult<UnifiedSymbol>> {
    const us = await UnifiedSymbol.find({});
    return ListResult.list(us);
  }
}
