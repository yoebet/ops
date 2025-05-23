import { Test } from '@nestjs/testing';
import { CommonServicesModule } from '@/common-services/common-services.module';
import { ExOrder, OrderStatus } from '@/db/models/ex-order';
import { TradeSide } from '@/data-service/models/base';
import { ExchangeSymbol } from '@/db/models/ex/exchange-symbol';
import { UserExAccount } from '@/db/models/sys/user-ex-account';
import { ExTradeType } from '@/db/models/exchange-types';

jest.setTimeout(60_000);

describe('ex-order', () => {
  beforeEach(async () => {
    await Test.createTestingModule({
      imports: [CommonServicesModule],
    }).compile();
  });

  it('save order', async () => {
    const userExAccountId = 1;
    const symbol = 'DOGE/USDT';

    const ue = await UserExAccount.findOneBy({ id: userExAccountId });

    const exSymbol = await ExchangeSymbol.findOne({
      where: {
        ex: ue.ex,
        symbol,
      },
      relations: ['unifiedSymbol'],
    });
    // const exAccount = exSymbol.exAccount;
    const unifiedSymbol = exSymbol.unifiedSymbol;

    const order = new ExOrder();
    order.userExAccountId = ue.id;
    order.ex = exSymbol.ex;
    order.market = exSymbol.market;
    order.symbol = exSymbol.symbol;
    order.rawSymbol = exSymbol.rawSymbol;
    order.baseCoin = unifiedSymbol.base;
    order.side = TradeSide.buy;
    order.tradeType = ExTradeType.spot;
    order.timeType = 'gtc';
    order.status = OrderStatus.notSummited;
    order.clientOrderId = `s${Math.round(Date.now() / 1000) - 1e9}`;
    order.priceType = 'limit';
    order.limitPrice = 0.35;
    order.baseSize = 1000;
    // order.quoteAmount = 2000;
    // order.reduceOnly = true;
    order.algoOrder = false;
    order.tpslType = 'tpsl';
    order.tpTriggerPrice = 0.36;
    order.tpOrderPrice = 0.37;
    order.slTriggerPrice = 0.34;
    order.slOrderPrice = 0.33;
    // order.moveDrawbackRatio = 0.02;
    // order.moveActivePrice = 0.36;

    // order.exOrderId = '';
    // order.execAvgPrice = '';
    // order.execSize = '';
    // order.execAmount = '';
    // order.exCreatedAt = '';
    // order.exUpdatedAt = '';
    // order.exClosedAt = '';

    // order.raw = {};

    await ExOrder.save(order);
  });
});
