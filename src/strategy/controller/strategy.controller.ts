import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
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
import { ExSymbolService } from '@/common-services/ex-symbol.service';
import { UserExAccount } from '@/db/models/sys/user-ex-account';

@Controller('strategies')
@UseInterceptors(CSI)
export class StrategyController {
  constructor(
    private strategyService: StrategyService,
    private exSymbolService: ExSymbolService,
  ) {}

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
      order: { createdAt: 'desc' },
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

  @Post(':id/clone')
  async cloneStrategy(
    @Param('id', ParseIntPipe) id: number,
    @Body() params: { memo?: string },
  ): Promise<ValueResult<Strategy>> {
    return this.strategyService.cloneStrategy(id, params?.memo);
  }

  @Delete(':id')
  async dropStrategy(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResult> {
    return this.strategyService.dropStrategy(id);
  }

  private async prepareDto(dto: Strategy) {
    delete dto.id;
    delete dto.createdAt;
    delete dto.userExAccountId;
    if (!dto.market || !dto.rawSymbol) {
      await this.exSymbolService.ensureLoaded();
      const es = this.exSymbolService.getExchangeSymbolByES(dto.ex, dto.symbol);
      dto.rawSymbol = es.symbol;
      dto.market = es.market;
    }
  }

  @Post()
  async create(
    @CurrentUser() user: UserInfo,
    @Body() dto: Strategy,
  ): Promise<ValueResult<Strategy>> {
    await this.prepareDto(dto);
    const uea = await UserExAccount.findOne({
      select: ['id'],
      where: {
        // userId: user.userId, // FIXME
        ex: dto.ex,
      },
    });
    // TODO:
    dto.userExAccountId = uea.id;
    const st = new Strategy();
    Object.assign(st, dto);
    await st.save();
    return ValueResult.value(st);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Strategy,
  ): Promise<ApiResult> {
    await this.prepareDto(dto);
    const st = await Strategy.findOneBy({ id });
    if (!st) {
      return ApiResult.fail(`strategy not found`);
    }
    Object.assign(st, dto);
    // TODO: userExAccountId
    await st.save();
    return ApiResult.success();
  }
}
