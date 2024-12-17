import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ClassSerializerInterceptor as CSI } from '@nestjs/common/serializer/class-serializer.interceptor';
import { ListResult, ValueResult } from '@/common/api-result';
import { Strategy } from '@/db/models/strategy/strategy';
import { CurrentUser } from '@/auth/decorators/user.decorator';
import { UserInfo } from '@/auth/user-info';
import { ParseIntPipe } from '@nestjs/common/pipes/parse-int.pipe';
import { StrategyOrder } from '@/db/models/strategy/strategy-order';
import { ExOrder } from '@/db/models/ex-order';

@Controller('strategies')
@UseInterceptors(CSI)
export class StrategyController {
  constructor() {}

  @Get('')
  async all(@CurrentUser() user: UserInfo): Promise<ListResult<Strategy>> {
    const sts = await Strategy.find({
      select: Strategy.listFields,
    });
    return ListResult.list(sts);
  }

  @Get(':id')
  async getOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ValueResult<Strategy>> {
    const st = await Strategy.findOneBy({ id });
    return ValueResult.value(st);
  }

  @Get(':id/orders')
  async orders(
    @CurrentUser() user: UserInfo,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ListResult<StrategyOrder>> {
    const sts = await ExOrder.find({
      select: StrategyOrder.listFields,
      where: { strategyId: id },
    });
    return ListResult.list(sts);
  }
}
