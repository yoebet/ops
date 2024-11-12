import { Column, Index } from 'typeorm';
import { BaseModel } from '@/db/models/base-model';
import { ExAccountCode, ExchangeCode } from '@/db/models/exchange-types';

export class ExSymbolBase extends BaseModel {
  @Column()
  ex: ExchangeCode;

  @Column()
  exAccount: ExAccountCode;

  @Column()
  baseCoin: string;

  @Index()
  @Column()
  symbol: string;

  @Index()
  @Column()
  rawSymbol: string;
}
