import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseInterceptors,
} from '@nestjs/common';
import { ClassSerializerInterceptor as CSI } from '@nestjs/common/serializer/class-serializer.interceptor';
import { StrategyTemplate } from '@/db/models/strategy/strategy-template';
import { ApiResult, ListResult, ValueResult } from '@/common/api-result';
import { ParseIntPipe } from '@nestjs/common/pipes/parse-int.pipe';

@Controller('strategy-templates')
@UseInterceptors(CSI)
export class StrategyTemplateController {
  constructor() {}

  @Get('')
  async all(): Promise<ListResult<StrategyTemplate>> {
    const sts = await StrategyTemplate.find({
      select: StrategyTemplate.listFields,
      order: { createdAt: 'desc' },
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

  @Post()
  async create(
    @Body() dto: StrategyTemplate,
  ): Promise<ValueResult<StrategyTemplate>> {
    const st = new StrategyTemplate();
    delete dto.id;
    delete dto.createdAt;
    Object.assign(st, dto);
    await st.save();
    return ValueResult.value(st);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StrategyTemplate,
  ): Promise<ApiResult> {
    delete dto.id;
    delete dto.createdAt;
    await StrategyTemplate.update(id, dto);
    return ApiResult.success();
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<ApiResult> {
    await StrategyTemplate.delete(id);
    return ApiResult.success();
  }
}
