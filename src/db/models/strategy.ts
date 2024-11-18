import { Column, Entity, Index, Unique } from 'typeorm';
import { ExSymbolBase } from '@/db/models/ex-symbol-base';
import { ExTradeType } from '@/db/models/exchange-types';
import { TradeSide } from '@/data-service/models/base';
import { ExApiKey } from '@/exchange/base/rest/rest.type';
import { StrategyTemplate } from '@/db/models/strategy-template';
import { StrategyDeal } from '@/db/models/strategy-deal';

@Entity()
@Unique(['templateId', 'userExAccountId', 'tradeType', 'symbol'])
export class Strategy extends ExSymbolBase {
  @Column()
  @Index()
  templateId: number;

  @Column()
  name: string;

  // @Column()
  // userId: number;

  @Column()
  @Index()
  userExAccountId: number;

  @Column()
  tradeType: ExTradeType;

  @Column({ nullable: true })
  currentDealId?: number;

  // @Column({ nullable: true })
  // lastDealId?: number;

  @Column({ nullable: true })
  nextTradeSide?: TradeSide;

  @Column('numeric', { nullable: true })
  quotaAmount?: number;

  @Column()
  active: boolean;

  // @Column('numeric', { nullable: true })
  // accumulatedPnlUsd?: number;

  @Column('jsonb', { select: false, nullable: true })
  params?: any;

  @Column('jsonb', { select: false, nullable: true })
  runtimeParams?: any;

  @Column({ nullable: true })
  paperTrade?: boolean;

  @Column({ nullable: true })
  jobSummited?: boolean;

  template?: StrategyTemplate;
  apiKey?: ExApiKey;
  currentDeal?: StrategyDeal;
}
