import { Column, Entity, Index, Unique } from 'typeorm';
import { ExSymbolBase } from '@/db/models/ex-symbol-base';
import { ExTradeType } from '@/db/models/exchange-types';
import { TradeSide } from '@/data-service/models/base';
import { ExApiKey } from '@/exchange/base/rest/rest.type';
import { StrategyDeal } from '@/db/models/strategy-deal';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';

@Entity()
@Unique(['templateCode', 'userExAccountId', 'tradeType', 'symbol'])
export class Strategy extends ExSymbolBase {
  @Column()
  // @Index()
  templateCode: string;

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
  baseSize?: number;

  @Column('numeric', { nullable: true })
  quoteAmount?: number;

  @Column()
  active: boolean;

  // @Column('numeric', { nullable: true })
  // accumulatedPnlUsd?: number;

  @Column('jsonb', { nullable: true })
  params?: any;

  @Column('jsonb', { nullable: true })
  runtimeParams?: any;

  @Column({ nullable: true })
  paperTrade?: boolean;

  @Column({ nullable: true })
  jobSummited?: boolean;

  // template?: StrategyTemplate;
  apiKey?: ExApiKey;
  currentDeal?: StrategyDeal;
  exchangeSymbol?: ExchangeSymbol;
}
