import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ClassSerializerInterceptor as CSI } from '@nestjs/common/serializer/class-serializer.interceptor';
import { ApiResult, ListResult, ValueResult } from '@/common/api-result';
import { Strategy } from '@/db/models/strategy/strategy';
import { CurrentUser } from '@/auth/decorators/user.decorator';
import { UserInfo } from '@/auth/user-info';
import { ParseIntPipe } from '@nestjs/common/pipes/parse-int.pipe';
import { StrategyOrder } from '@/db/models/strategy/strategy-order';
import { ExOrder, OrderStatus } from '@/db/models/ex-order';
import { StrategyDeal } from '@/db/models/strategy/strategy-deal';
import { StrategyService } from '@/strategy/strategy.service';

@Controller('strategies')
@UseInterceptors(CSI)
export class StrategyController {
  constructor(private strategyService: StrategyService) {}

  @Get('')
  async query(
    @CurrentUser() user: UserInfo,
    @Query('type') type?: 'paper' | 'real',
  ): Promise<ListResult<Strategy>> {
    const paperTrade =
      type === 'paper' ? true : type === 'real' ? false : undefined;
    const sts = await Strategy.find({
      select: Strategy.listFields,
      where: {
        paperTrade,
      },
    });

    const sm = new Map(sts.map((s) => [s.id, s]));

    const ds: { cid: number; count: string }[] =
      await StrategyDeal.createQueryBuilder()
        .select('strategy_id', 'cid')
        .addSelect('count(*)', 'count')
        .where({ paperTrade })
        .addGroupBy('strategy_id')
        .execute();
    for (const c of ds) {
      const s = sm.get(c.cid);
      if (s) {
        s.dealsCount = +c.count;
      }
    }

    const os: { cid: number; count: string }[] =
      await ExOrder.createQueryBuilder()
        .select('strategy_id', 'cid')
        .addSelect('count(*)', 'count')
        .where({ status: 'filled' })
        .andWhere({ paperTrade })
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
  ): Promise<ValueResult<Strategy>> {
    const st = await Strategy.findOneBy({ id });

    const count = await StrategyDeal.createQueryBuilder()
      .where({ strategyId: id })
      .getCount();
    if (count != null) {
      st.dealsCount = +count;
    }

    const count2 = await ExOrder.createQueryBuilder()
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
  ): Promise<ListResult<StrategyOrder>> {
    const sts = await ExOrder.find({
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
  ): Promise<ListResult<StrategyDeal>> {
    const sts = await StrategyDeal.find({
      select: StrategyDeal.listFields,
      where: { strategyId: id },
      order: { createdAt: 'desc' },
    });
    return ListResult.list(sts);
  }

  @Post('jobs/remove-all')
  async removeAllJobs(): Promise<ApiResult> {
    await this.strategyService.removeAllJobs();
    return ApiResult.success();
  }

  @Post(':id/job/:op')
  async job(
    @Param('id', ParseIntPipe) id: number,
    @Param('op') op: string,
  ): Promise<ApiResult> {
    return this.strategyService.operateJob(id, op as any);
  }
}
