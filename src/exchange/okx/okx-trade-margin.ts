import { ExRestParams } from '@/exchange/base/rest/rest.type';
import { OkxTradeBase } from '@/exchange/okx/okx-trade-base';
import { RestTypes } from '@/exchange/okx/types';

export class OkxTradeMargin extends OkxTradeBase {
  protected tradeMode: RestTypes['TradeMode'] = 'cross';

  constructor(params?: Partial<ExRestParams>) {
    super(params);
  }
}
