import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ClassSerializerInterceptor as CSI } from '@nestjs/common/serializer/class-serializer.interceptor';
import { ListResult, ValueResult } from '@/common/api-result';
import { CurrentUser } from '@/auth/decorators/user.decorator';
import { UserInfo } from '@/auth/user-info';
import { ParseIntPipe } from '@nestjs/common/pipes/parse-int.pipe';
import { StrategyOrder } from '@/db/models/strategy/strategy-order';
import { BacktestStrategy } from '@/db/models/strategy/backtest-strategy';
import { BacktestOrder } from '@/db/models/strategy/backtest-order';

@Controller('bt-strategies')
@UseInterceptors(CSI)
export class StrategyBacktestController {
  constructor() {}

  @Get('')
  async all(
    @CurrentUser() user: UserInfo,
  ): Promise<ListResult<BacktestStrategy>> {
    const sts = await BacktestStrategy.find({
      select: BacktestStrategy.btListFields,
    });
    return ListResult.list(sts);
  }

  @Get(':id')
  async getOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ValueResult<BacktestStrategy>> {
    const st = await BacktestStrategy.findOneBy({ id });
    return ValueResult.value(st);
  }

  @Get(':id/orders')
  async orders(
    @CurrentUser() user: UserInfo,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ListResult<BacktestOrder>> {
    const sts = await BacktestOrder.find({
      select: StrategyOrder.listFields,
      where: { strategyId: id },
    });
    return ListResult.list(sts);
  }
}
