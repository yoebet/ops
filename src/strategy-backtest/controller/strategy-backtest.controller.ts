import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ClassSerializerInterceptor as CSI } from '@nestjs/common/serializer/class-serializer.interceptor';
import { ApiResult, ListResult, ValueResult } from '@/common/api-result';
import { CurrentUser } from '@/auth/decorators/user.decorator';
import { UserInfo } from '@/auth/user-info';
import { ParseIntPipe } from '@nestjs/common/pipes/parse-int.pipe';
import { StrategyOrder } from '@/db/models/strategy/strategy-order';
import { BacktestStrategy } from '@/db/models/strategy/backtest-strategy';
import { BacktestOrder } from '@/db/models/strategy/backtest-order';
import { BacktestDeal } from '@/db/models/strategy/backtest-deal';
import { OrderStatus } from '@/db/models/ex-order';
import { BacktestService } from '@/strategy-backtest/backtest.service';
import { StrategyDeal } from '@/db/models/strategy/strategy-deal';

@Controller('bt-strategies')
@UseInterceptors(CSI)
export class StrategyBacktestController {
  constructor(protected backtestService: BacktestService) {}

  @Get('')
  async all(
    @CurrentUser() user: UserInfo,
  ): Promise<ListResult<BacktestStrategy>> {
    const sts = await BacktestStrategy.find({
      select: BacktestStrategy.btListFields,
      order: { createdAt: 'desc' },
    });

    const sm = new Map(sts.map((s) => [s.id, s]));

    const ds: { cid: number; count: string }[] =
      await BacktestDeal.createQueryBuilder()
        .select('strategy_id', 'cid')
        .addSelect('count(*)', 'count')
        .addGroupBy('strategy_id')
        .execute();
    for (const c of ds) {
      const s = sm.get(c.cid);
      if (s) {
        s.dealsCount = +c.count;
      }
    }

    const os: { cid: number; count: string }[] =
      await BacktestOrder.createQueryBuilder()
        .select('strategy_id', 'cid')
        .addSelect('count(*)', 'count')
        .addGroupBy('strategy_id')
        .execute();
    for (const c of os) {
      const s = sm.get(c.cid);
      if (s) {
        s.ordersCount = +c.count;
      }
    }

    return ListResult.list(sts);
  }

  @Get(':id')
  async getOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ValueResult<BacktestStrategy>> {
    const st = await BacktestStrategy.findOneBy({ id });

    const count = await BacktestDeal.createQueryBuilder()
      .where({ strategyId: id })
      .getCount();
    if (count != null) {
      st.dealsCount = +count;
    }

    const count2 = await BacktestOrder.createQueryBuilder()
      .where({ strategyId: id })
      .getCount();
    if (count2 != null) {
      st.ordersCount = +count2;
    }

    return ValueResult.value(st);
  }

  @Get(':id/orders')
  async orders(
    @CurrentUser() user: UserInfo,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ListResult<BacktestOrder>> {
    const sts = await BacktestOrder.find({
      select: StrategyOrder.listFields,
      where: { strategyId: id, status: OrderStatus.filled },
      order: { createdAt: 'desc' },
    });
    return ListResult.list(sts);
  }

  @Get(':id/deals')
  async deals(
    // @CurrentUser() user: UserInfo,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ListResult<BacktestDeal>> {
    const sts = await BacktestDeal.find({
      select: StrategyDeal.listFields,
      where: { strategyId: id },
      order: { createdAt: 'desc' },
    });
    return ListResult.list(sts);
  }

  @Post('jobs/remove-all')
  async removeAllJobs(): Promise<ApiResult> {
    await this.backtestService.removeAllJobs();
    return ApiResult.success();
  }

  @Post(':id/job/:op')
  async job(
    @Param('id', ParseIntPipe) id: number,
    @Param('op') op: string,
  ): Promise<ApiResult> {
    return this.backtestService.operateJob(id, op as any);
  }

  @Post(':id/clone')
  async cloneStrategy(
    @Param('id', ParseIntPipe) id: number,
    @Body() params: { memo?: string },
  ): Promise<ValueResult<BacktestStrategy>> {
    return this.backtestService.cloneStrategy(id, params?.memo);
  }

  @Delete(':id')
  async dropStrategy(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResult> {
    return this.backtestService.dropStrategy(id);
  }
}
