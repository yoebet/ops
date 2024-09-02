import { Args, Query, Resolver, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { catchError, map } from 'rxjs';
import { ExMonitorService } from './ex-monitor.service';
import {
  ExObserveChannelInput,
  ExObserveStatusInput,
  ExWsShowInstancesInput,
  ExWsShowStatusInput,
  ExWsShowSymbolsInput,
} from './dto/ex-monitor.input';
import { AppLogger } from '@/common/app-logger';
import { anyToLines, textToLines, withObservable } from '@/gql/utils';

// exchange ws 实例管理/监控
@Resolver()
// @UseGuards(ApiTokenGuard)
export class ExMonitorResolver {
  constructor(
    private exMonitorService: ExMonitorService,
    private readonly logger: AppLogger,
  ) {}

  @Query(() => [String], {
    description: '列出所有交易所的ws实例',
  })
  async exWsAllInstances(): Promise<string[]> {
    const text = await this.exMonitorService.showAllInstances();
    return textToLines(text);
  }

  @Query(() => [String], {
    description: '列出 ws实例',
  })
  async exWsInstances(
    @Args('input') input: ExWsShowInstancesInput,
  ): Promise<string[]> {
    const text = await this.exMonitorService.showWsInstances(input);
    return textToLines(text);
  }

  @Query(() => [String], {
    description: '查看 ws实例 状态',
  })
  async exWsStatus(
    @Args('input') input: ExWsShowStatusInput,
  ): Promise<string[]> {
    const text = await this.exMonitorService.showWsStatus(input);
    return textToLines(text);
  }

  @Query(() => [String], {
    description: '查看 ws实例运行的Symbol',
  })
  async exWsRunningSymbols(
    @Args('input') input: ExWsShowSymbolsInput,
  ): Promise<string[]> {
    const text = await this.exMonitorService.showWsRunningSymbols(input);
    return textToLines(text);
  }

  pubSub = new PubSub();

  @Subscription((_) => [String], {
    name: 'exWsObserveStatus',
    description: '周期性查看ws实例状态',
  })
  exWsObserveStatus(@Args('input') input: ExObserveStatusInput) {
    this.logger.debug(input);
    const statusObs = this.exMonitorService.observeStatus(input).pipe(
      map(textToLines),
      catchError((e) => {
        this.logger.error(e);
        return [];
      }),
    );
    return withObservable<string[]>(
      statusObs,
      this.pubSub,
      'exWsObserveStatus',
    );
  }

  @Subscription((_) => [String], {
    name: 'exWsObserveChannel',
    description: '抽样ws频道（subject）',
  })
  exWsObserveChannel(@Args('input') input: ExObserveChannelInput) {
    this.logger.debug(input);
    const channelObs = this.exMonitorService.observeChannel(input).pipe(
      map(anyToLines),
      catchError((e) => {
        this.logger.error(e);
        return [];
      }),
    );
    return withObservable<string[]>(
      channelObs,
      this.pubSub,
      'exWsObserveChannel',
    );
  }
}
