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
import { AfterLoad } from 'typeorm/decorator/listeners/AfterLoad';

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

  @Column('numeric', { nullable: true })
  baseSize?: number;

  @Column('numeric', { nullable: true })
  quoteAmount?: number;

  @Column()
  active: boolean;

  @Column('jsonb', { nullable: true })
  params?: any;

  @Column({ nullable: true })
  paperTrade?: boolean;

  @Column({ nullable: true })
  jobSummited?: boolean;

  @AfterLoad()
  onLoaded() {
    if (this.baseSize != null) {
      this.baseSize = +this.baseSize;
    }
    if (this.quoteAmount != null) {
      this.quoteAmount = +this.quoteAmount;
    }
  }

  // template?: StrategyTemplate;
  apiKey?: ExApiKey;
  currentDeal?: StrategyDeal;
  lastDeal?: StrategyDeal;
  exchangeSymbol?: ExchangeSymbol;

  dealsCount?: number;
  ordersCount?: number;
}
