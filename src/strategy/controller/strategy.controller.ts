import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ClassSerializerInterceptor as CSI } from '@nestjs/common/serializer/class-serializer.interceptor';
import { ListResult, ValueResult } from '@/common/api-result';
import { Strategy } from '@/db/models/strategy/strategy';
import { CurrentUser } from '@/auth/decorators/user.decorator';
import { UserInfo } from '@/auth/user-info';
import { ParseIntPipe } from '@nestjs/common/pipes/parse-int.pipe';
import { StrategyOrder } from '@/db/models/strategy/strategy-order';
import { ExOrder } from '@/db/models/ex-order';
import { StrategyDeal } from '@/db/models/strategy/strategy-deal';

@Controller('strategies')
@UseInterceptors(CSI)
export class StrategyController {
  constructor() {}

  @Get('')
  async all(@CurrentUser() user: UserInfo): Promise<ListResult<Strategy>> {
    const sts = await Strategy.find({
      select: Strategy.listFields,
    });

    const sm = new Map(sts.map((s) => [s.id, s]));

    const ds: { cid: number; count: string }[] =
      await StrategyDeal.createQueryBuilder()
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
      await ExOrder.createQueryBuilder()
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
      where: { strategyId: id },
    });
    return ListResult.list(sts);
  }
}
