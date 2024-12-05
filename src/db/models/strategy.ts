import { Column, Entity, Index } from 'typeorm';
import { ExSymbolBase } from '@/db/models/ex-symbol-base';
import { ExTradeType } from '@/db/models/exchange-types';
import { ExApiKey } from '@/exchange/base/rest/rest.type';
import { StrategyDeal } from '@/db/models/strategy-deal';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';
import {
  ConsiderSide,
  OppCheckerAlgo,
  StrategyAlgo,
} from '@/strategy/strategy.types';

@Entity()
// @Index(['algoCode', 'userExAccountId', 'tradeType', 'symbol'])
export class Strategy extends ExSymbolBase {
  @Column()
  // @Index()
  algoCode: StrategyAlgo;

  @Column()
  name: string;

  @Column({ nullable: true })
  openAlgo?: OppCheckerAlgo;

  @Column({ nullable: true })
  closeAlgo?: OppCheckerAlgo;

  @Column({ nullable: true })
  openDealSide?: ConsiderSide;

  // @Column()
  // userId: number;

  @Column()
  @Index()
  userExAccountId: number;

  @Column()
  tradeType: ExTradeType;

  @Column({ nullable: true })
  currentDealId?: number;

  @Column({ nullable: true })
  lastDealId?: number;

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

  @Column({ nullable: true })
  paperTrade?: boolean;

  @Column({ nullable: true })
  jobSummited?: boolean;

  // template?: StrategyTemplate;
  apiKey?: ExApiKey;
  currentDeal?: StrategyDeal;
  lastDeal?: StrategyDeal;
  exchangeSymbol?: ExchangeSymbol;
}
