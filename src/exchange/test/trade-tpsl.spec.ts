import { Test } from '@nestjs/testing';
import { ExchangeCode, ExTradeType } from '@/db/models/exchange-types';
import { ExchangeModule } from '@/exchange/exchange.module';
import { Exchanges } from '@/exchange/exchanges';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';
import {
  PlaceOrderParams,
  PlaceTpslOrderParams,
} from '@/exchange/exchange-service-types';
import { TestConfig } from '@/env.local.test';
import { round } from '@/common/utils/utils';

const { testApiKeys: apiKeys } = TestConfig.exchange;

jest.setTimeout(10 * 60 * 1000);

describe('Exchange Trade Tpsl', () => {
  let restService: Exchanges;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ExchangeModule],
    }).compile();

    await moduleRef.init();

    restService = moduleRef.get(Exchanges);
  });

  it('place order - tpsl attach', async () => {
    const symbol = 'DOGE/USDT';
    const quoteQuantity = false;
    const margin = true;

    const ex = ExchangeCode.okx;
    const tradeType: ExTradeType = margin
      ? ExTradeType.margin
      : ExTradeType.spot;

    const exSymbol = await ExchangeSymbol.findOne({
      where: {
        ex,
        symbol,
      },
      relations: ['unifiedSymbol'],
    });
    const unifiedSymbol = exSymbol.unifiedSymbol;

    const quoteAmount = 5 + 1 / 3;
    const size = 30 + 1 / 3;
    const curPrice = 0.28;
    const price = curPrice * 0.95;

    const params: PlaceOrderParams = {
      side: 'buy',
      symbol: exSymbol.rawSymbol,
      priceType: 'limit',
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
      algoOrder: false,
    };
    if (margin) {
      params.marginMode = 'cross';
      params.marginCoin = unifiedSymbol.quote;
    }

    const priceDigits = exSymbol.priceDigits;

    if (params.priceType === 'limit') {
      params.price = round(price, priceDigits);
    }

    if (quoteQuantity) {
      params.quoteAmount = quoteAmount.toFixed(2);
      params.marginCoin = unifiedSymbol.quote;
    } else {
      params.baseSize = round(size, exSymbol.baseSizeDigits);
    }

    params.algoType = 'tpsl';

    const tpPrice = price * 1.1;
    const tpTriggerPrice = price * 1.05;
    const slPrice = price * 0.9;
    const slTriggerPrice = price * 0.95;

    params.tpOrderPrice = round(tpPrice, priceDigits);
    params.tpTriggerPrice = round(tpTriggerPrice, priceDigits);
    params.slOrderPrice = round(slPrice, priceDigits);
    params.slTriggerPrice = round(slTriggerPrice, priceDigits);

    const exService = restService.getExTradeService(ex, tradeType);

    const apiKey = apiKeys[ex];

    const result = await exService.placeOrder(apiKey, params);
  });

  it('place order - tpsl separate', async () => {
    const symbol = 'DOGE/USDT';
    const quoteQuantity = false;
    const margin = true;

    const ex = ExchangeCode.okx;
    const tradeType: ExTradeType = margin
      ? ExTradeType.margin
      : ExTradeType.spot;

    const exSymbol = await ExchangeSymbol.findOne({
      where: {
        ex,
        symbol,
      },
      relations: ['unifiedSymbol'],
    });
    const unifiedSymbol = exSymbol.unifiedSymbol;

    const quoteAmount = 5 + 1 / 3;
    const size = 30 + 1 / 3;
    const curPrice = 0.28;
    const price = curPrice * 0.95;

    const params: PlaceTpslOrderParams = {
      side: 'buy',
      symbol: exSymbol.rawSymbol,
      priceType: 'limit',
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
      algoOrder: true,
    };
    if (margin) {
      params.marginMode = 'cross';
      params.marginCoin = unifiedSymbol.quote;
    }

    const priceDigits = exSymbol.priceDigits;

    if (params.priceType === 'limit') {
      params.price = round(price, priceDigits);
    }

    if (quoteQuantity) {
      params.quoteAmount = quoteAmount.toFixed(2);
      params.marginCoin = unifiedSymbol.quote;
    } else {
      params.baseSize = round(size, exSymbol.baseSizeDigits);
    }

    const moving = true;
    if (moving) {
      params.algoType = 'move';
      params.moveDrawbackRatio = '0.05';
      params.moveActivePrice = round(curPrice * 0.9, priceDigits);
    } else {
      params.algoType = 'tpsl';
      const tpPrice = price * 1.1;
      const tpTriggerPrice = price * 1.05;
      const slPrice = price * 0.9;
      const slTriggerPrice = price * 0.95;
      params.tpOrderPrice = round(tpPrice, priceDigits);
      params.slOrderPrice = round(slPrice, priceDigits);
      if (tpTriggerPrice) {
        params.tpTriggerPrice = round(tpTriggerPrice, priceDigits);
      }
      if (slTriggerPrice) {
        params.slTriggerPrice = round(slTriggerPrice, priceDigits);
      }
    }

    const exService = restService.getExTradeService(ex, tradeType);

    const apiKey = apiKeys[ex];

    const result = await exService.placeTpslOrder(apiKey, params);
  });
});
