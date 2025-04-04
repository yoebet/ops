import { Column, Entity } from 'typeorm';
import { ExSymbolBase } from '@/db/models/strategy/ex-symbol-base';
import { TradeSide } from '@/data-service/models/base';

// @Entity()
export class ExPosition extends ExSymbolBase {
  @Column()
  side: TradeSide;
}
