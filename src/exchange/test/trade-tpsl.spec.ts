import { Test } from '@nestjs/testing';
import { ExAccountCode } from '@/db/models/exchange-types';
import { ExchangeModule } from '@/exchange/exchange.module';
import { ExchangeRestService } from '@/exchange/exchange-rest.service';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';
import { PlaceOrderParams } from '@/exchange/rest-types';
import { TestConfig } from '@/env.local.test';
import { wait } from '@/common/utils/utils';

const { apiKeys } = TestConfig.exchange;

jest.setTimeout(10 * 60 * 1000);

describe('Exchange Trade Tpsl', () => {
  let restService: ExchangeRestService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ExchangeModule],
    }).compile();

    await moduleRef.init();

    restService = moduleRef.get(ExchangeRestService);
  });

  it('place order - attach tpsl', async () => {
    const symbol = 'DOGE/USDT';
    const quoteQuantity = false;
    const margin = true;
    const exAccount = ExAccountCode.okxUnified;

    const exSymbol = await ExchangeSymbol.findOne({
      where: {
        exAccount,
        symbol,
      },
      relations: ['unifiedSymbol'],
    });
    const unifiedSymbol = exSymbol.unifiedSymbol;

    const quoteAmount = 5 + 1 / 3;
    const size = 30 + 1 / 3;
    const curPrice = 0.283;
    const price = curPrice * 0.95;
    const tpPrice = price * 1.1;
    const tpTriggerPrice = price * 1.05;
    const slPrice = price * 0.9;
    const slTriggerPrice = price * 0.95;

    const params: PlaceOrderParams = {
      orderType: 'attach-tpsl',
      side: 'buy',
      symbol: exSymbol.rawSymbol,
      margin,
      type: 'limit',
      // size: sizeStr,
      clientOrderId: `test${Math.round(Date.now() / 1000) - 1e9}`,
      // quoteAmount: '',
      // ccy: '',
      // posSide: undefined,
      // reduceOnly: false,
      // settleCoin: '',
      // price: '',
      // timeType: undefined,
      // tp: {},
      // sl: {},
      // mtpsl: {},
    };
    if (margin) {
      params.marginMode = 'cross';
      params.ccy = unifiedSymbol.quote;
    }

    const priceDigits = exSymbol.priceDigits;

    if (params.type === 'limit') {
      if (priceDigits != null) {
        params.price = price.toFixed(priceDigits);
      } else {
        params.price = '' + price;
      }
    }

    if (quoteQuantity) {
      params.quoteAmount = quoteAmount.toFixed(2);
      params.ccy = unifiedSymbol.quote;
    } else {
      let sizeStr = '';
      if (exSymbol.baseSizeDigits != null) {
        sizeStr = size.toFixed(exSymbol.baseSizeDigits);
      } else {
        // sizeStr = size.toFixed(8);
        sizeStr = '' + size;
      }
      params.size = sizeStr;
    }

    if (params.orderType === 'attach-tpsl') {
      params.tp = {};
      params.sl = {};
      if (priceDigits != null) {
        params.tp.orderPrice = tpPrice.toFixed(priceDigits);
        params.sl.orderPrice = slPrice.toFixed(priceDigits);
        if (tpTriggerPrice) {
          params.tp.triggerPrice = tpTriggerPrice.toFixed(priceDigits);
        }
        if (slTriggerPrice) {
          params.sl.triggerPrice = slTriggerPrice.toFixed(priceDigits);
        }
      } else {
        params.tp.orderPrice = '' + tpPrice;
        params.sl.orderPrice = '' + slPrice;
        if (tpTriggerPrice) {
          params.tp.triggerPrice = '' + tpTriggerPrice;
        }
        if (slTriggerPrice) {
          params.sl.triggerPrice = '' + slTriggerPrice;
        }
      }
    }

    const exService = restService.getExRest(exAccount);

    const apiKey = apiKeys[exAccount];

    const result = await exService.placeOrder(apiKey, params);
  });
});
