import { Column, Entity, Index } from 'typeorm';
import { ExSymbolBase } from '@/db/models/strategy/ex-symbol-base';
import { ExTradeType } from '@/db/models/exchange-types';
import { ExApiKey } from '@/exchange/base/rest/rest.type';
import { StrategyDeal } from '@/db/models/strategy/strategy-deal';
import { ExchangeSymbol } from '@/db/models/ex/exchange-symbol';
import {
  ConsiderSide,
  OppCheckerAlgo,
  StrategyAlgo,
} from '@/strategy/strategy.types';
import { NumericColumn } from '@/db/models/base-model';

@Entity()
// @Index(['algoCode', 'userExAccountId', 'tradeType', 'symbol'])
export class Strategy extends ExSymbolBase {
  static listFields: (keyof Strategy)[] = [
    'id',
    'ex',
    'market',
    'baseCoin',
    'symbol',
    'rawSymbol',
    'algoCode',
    'name',
    'openAlgo',
    'closeAlgo',
    'openDealSide',
    'tradeType',
    'currentDealId',
    'lastDealId',
    'baseSize',
    'quoteAmount',
    'active',
    'paperTrade',
    'jobSummited',
    'createdAt',
    'memo',
  ];

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

  @NumericColumn({ nullable: true })
  baseSize?: number;

  @NumericColumn({ nullable: true })
  quoteAmount?: number;

  @Column()
  active: boolean;

  @Column('jsonb', { nullable: true })
  params?: any;

  @Column({ nullable: true })
  paperTrade?: boolean;

  @Column({ nullable: true })
  jobSummited?: boolean;

  @Column({ nullable: true })
  memo?: string;

  // template?: StrategyTemplate;
  apiKey?: ExApiKey;
  currentDeal?: StrategyDeal;
  lastDeal?: StrategyDeal;
  exchangeSymbol?: ExchangeSymbol;

  pnlUsd?: number;
  dealsCount?: number;
  ordersCount?: number;
}
