import { Field, InputType } from '@nestjs/graphql';
import { WsStatusType } from '@/exchange/base/ws/ex-ws-monitor-types';
import { ExAccountCode } from '@/exchange/exchanges-types';

@InputType()
export class ExObjFilter {
  @Field({ description: '路径' })
  path: string;

  @Field({ description: '值', nullable: true })
  value?: string;
}

@InputType()
export class ExWsInstanceSelector {
  @Field({ description: '仅叶子实例（非组合实例）', nullable: true })
  leafOnly?: boolean;

  @Field({ description: 'ws实例 id', nullable: true })
  ids?: string; // idWithoutEx

  @Field({ description: 'ws实例 category', nullable: true })
  category?: string;

  @Field({ description: 'ws实例 instanceIndex', nullable: true })
  instanceIndex?: number;

  @Field({
    description: '包含此symbol的子实例（对多实例Subject而言）',
    nullable: true,
  })
  forSymbol?: string;
}

@InputType()
export abstract class ExInstanceSelector {
  @Field(() => ExAccountCode, { description: '交易所' })
  exchange: ExAccountCode;

  @Field(() => ExWsInstanceSelector, { nullable: true })
  wsInstance?: ExWsInstanceSelector;
}

@InputType()
export class ExWatchedKeysCountInput {
  @Field(() => ExAccountCode, { description: '交易所' })
  exchange: ExAccountCode;
}

@InputType()
export class ExWsShowInstancesInput {
  @Field(() => ExAccountCode, { description: '交易所' })
  exchange: ExAccountCode;
}

@InputType()
export class ExWsShowStatusInput extends ExInstanceSelector {
  @Field(() => WsStatusType, { description: '状态类型', nullable: true })
  type?: WsStatusType;
}

@InputType()
export class ExWsShowSymbolsInput extends ExInstanceSelector {
  @Field({ description: 'ws 频道（subject）', nullable: true })
  channel?: string;
}

@InputType()
export abstract class ExObserveInput extends ExInstanceSelector {
  @Field({ description: '最大观察元素数', nullable: true })
  maxTake?: number;

  @Field({ description: '最大观察时间', nullable: true })
  maxSeconds?: number;
}

@InputType()
export class ExObserveStatusInput extends ExObserveInput {
  @Field(() => WsStatusType, { description: '状态类型', nullable: true })
  type?: WsStatusType;

  @Field({ description: '间隔', nullable: true })
  interval?: number;
}

@InputType()
export class ExObserveChannelInput extends ExObserveInput {
  @Field({ description: 'ws 频道（subject）' })
  channel: string;

  @Field({ description: '最小间隔', nullable: true })
  minInterval?: number;

  @Field(() => ExObjFilter, { description: '筛选', nullable: true })
  filter?: ExObjFilter;
}
