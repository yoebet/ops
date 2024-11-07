import { OrderStatus, OrderTag } from '@/db/models/ex-order';
import { TradeSide } from '@/data-service/models/base';
import { BaseModel } from '@/db/models/base-model';

export class StrategyOrder extends BaseModel {
  static listFields: (keyof StrategyOrder)[] = [
    'id',
    'dealId',
    'tag',
    'side',
    'status',
    'clientOrderId',
    'priceType',
    'limitPrice',
    'baseSize',
    'quoteAmount',
    'algoOrder',
    'tpslType',
    'exOrderId',
    'execPrice',
    'execSize',
    'execAmount',
    'exCreatedAt',
    'exUpdatedAt',
    'memo',
  ];
  dealId?: number;

  tag?: OrderTag;

  side: TradeSide;

  status: OrderStatus;

  clientOrderId?: string;

  priceType: 'market' | 'limit';

  limitPrice?: number;

  baseSize?: number;

  quoteAmount?: number;

  algoOrder: boolean;

  tpslType?: 'tp' | 'sl' | 'tpsl' | 'move';

  // ---

  exOrderId?: string;

  execPrice?: number;

  execSize?: number;

  execAmount?: number;

  exCreatedAt?: Date;

  exUpdatedAt?: Date;

  memo?: string;
}
