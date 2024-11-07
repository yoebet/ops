import { Column, Index } from 'typeorm';
import { BaseModel } from '@/db/models/base-model';
import { ExchangeCode, ExMarket } from '@/db/models/exchange-types';

export class ExSymbolBase extends BaseModel {
  @Column()
  ex: ExchangeCode;

  @Column()
  market: ExMarket;

  @Column()
  baseCoin: string;

  @Index()
  @Column()
  symbol: string;

  @Index()
  @Column()
  rawSymbol: string;
}
