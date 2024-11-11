import { Column, Entity } from 'typeorm';
import { ExSymbolBase } from '@/db/models/ex-symbol-base';
import { TradeSide } from '@/data-service/models/base';

export class TpslParams {
  triggerPrice?: number;
  orderPrice?: number;
  orderKind?: 'condition' | 'limit';
  // default last
  // triggerPriceType?: 'last' | 'index' | 'mark';
}

export class MovingTpslParams {
  drawbackSpread?: number;
  drawbackRatio?: number;
  activePrice?: number;
}

// @Entity()
export class ExOrder extends ExSymbolBase {
  @Column()
  side: TradeSide;

  @Column()
  orderType: 'simple' | 'attach-tpsl' | 'tpsl';

  @Column()
  tpslType?: 'tp' | 'sl' | 'tpsl' | 'mtpsl';

  @Column()
  margin: boolean;

  @Column()
  marginMode: 'isolated' | 'cross';

  @Column()
  priceType: 'market' | 'limit';

  // gtc
  // fok：全部成交或立即取消
  // ioc：立即成交并取消剩余
  @Column({ nullable: true })
  timeType?: 'gtc' | 'fok' | 'ioc';

  @Column()
  status: 'pending' | 'partial-filled' | 'filled' | 'canceled';

  @Column({ nullable: true })
  exOrderId?: string;

  @Column({ nullable: true })
  clientOrderId?: string;

  @Column({ nullable: true })
  positionId?: string;

  @Column('jsonb', { nullable: true })
  tpParams?: TpslParams;

  @Column('jsonb', { nullable: true })
  slParams?: TpslParams;

  @Column('jsonb', { nullable: true })
  mtpslParams?: MovingTpslParams;

  // ---

  @Column({ nullable: true })
  limitPrice?: number;

  @Column({ nullable: true })
  reqSize?: number;

  @Column({ nullable: true })
  quoteAmount?: number;

  @Column({ nullable: true })
  reduceOnly?: boolean;

  @Column({ nullable: true })
  posId?: string;

  @Column({ nullable: true })
  strategyId?: string;

  @Column('jsonb', { nullable: true })
  strategyParams?: any;

  // ---

  @Column({ nullable: true })
  execAvgPrice?: number;

  @Column({ nullable: true })
  execSize?: number;

  @Column({ nullable: true })
  execAmount?: number;

  @Column({ nullable: true })
  filledAt?: Date;

  @Column({ nullable: true })
  exCreatedAt?: Date;

  @Column({ nullable: true })
  exUpdatedAt?: Date;

  @Column({ nullable: true })
  exClosedAt?: Date;

  @Column('jsonb', { nullable: true })
  raw?: any;
}
