import { Test } from '@nestjs/testing';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { ExOrder, OrderStatus } from '@/db/models/ex-order';
import { TradeSide } from '@/data-service/models/base';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';
import { ExAccountCode } from '@/db/models/exchange-types';

jest.setTimeout(60_000);

describe('ex-order', () => {
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemConfigModule],
    }).compile();
  });

  it('save order', async () => {
    const symbol = 'DOGE/USDT';
    const margin = false;
    const exAccount = ExAccountCode.okxUnified;

    const exSymbol = await ExchangeSymbol.findOne({
      where: {
        exAccount,
        symbol,
      },
      relations: ['unifiedSymbol'],
    });
    const unifiedSymbol = exSymbol.unifiedSymbol;

    const order = new ExOrder();
    order.ex = exSymbol.ex;
    order.exAccount = exSymbol.exAccount;
    order.symbol = exSymbol.symbol;
    order.rawSymbol = exSymbol.rawSymbol;
    order.baseCoin = unifiedSymbol.base;
    order.side = TradeSide.buy;
    order.margin = margin;
    order.timeType = 'gtc';
    order.status = OrderStatus.notSummited;
    order.clientOrderId = `s${Math.round(Date.now() / 1000) - 1e9}`;
    order.priceType = 'limit';
    order.price = 0.35;
    order.baseSize = 1000;
    // order.quoteAmount = 2000;
    // order.reduceOnly = true;
    order.algoOrder = false;
    order.algoType = 'tpsl';
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
