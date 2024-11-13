import { ExRestParams } from '@/exchange/base/rest/rest.type';
import { OkxTradeBase } from '@/exchange/okx/okx-trade-base';

export class OkxTradeSpot extends OkxTradeBase {
  constructor(params?: Partial<ExRestParams>) {
    super(params);
  }
}
