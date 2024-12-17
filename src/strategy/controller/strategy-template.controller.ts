import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ClassSerializerInterceptor as CSI } from '@nestjs/common/serializer/class-serializer.interceptor';
import { StrategyTemplate } from '@/db/models/strategy/strategy-template';
import { ListResult, ValueResult } from '@/common/api-result';
import { ParseIntPipe } from '@nestjs/common/pipes/parse-int.pipe';

@Controller('strategy-templates')
@UseInterceptors(CSI)
export class StrategyTemplateController {
  constructor() {}

  @Get('')
  async all(): Promise<ListResult<StrategyTemplate>> {
    const sts = await StrategyTemplate.find({
      select: StrategyTemplate.listFields,
    });
    return ListResult.list(sts);
  }

  @Get(':id')
  async getOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ValueResult<StrategyTemplate>> {
    const st = await StrategyTemplate.findOneBy({ id });
    return ValueResult.value(st);
  }
}
