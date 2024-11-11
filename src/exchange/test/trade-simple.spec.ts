import { Test } from '@nestjs/testing';
import { ExAccountCode } from '@/db/models/exchange-types';
import { ExchangeModule } from '@/exchange/exchange.module';
import { ExchangeRestService } from '@/exchange/exchange-rest.service';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';
import { PlaceOrderParams } from '@/exchange/rest-types';
import { TestConfig } from '@/env.local.test';
import { round } from '@/common/utils/utils';

const { apiKeys } = TestConfig.exchange;

jest.setTimeout(10 * 60 * 1000);

describe('Exchange Trade Simple', () => {
  let restService: ExchangeRestService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ExchangeModule],
    }).compile();

    await moduleRef.init();

    restService = moduleRef.get(ExchangeRestService);
  });

  it('place order', async () => {
    const symbol = 'DOGE/USDT';
    const quoteQuantity = false;
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

    const quoteAmount = 50 + 1 / 3;
    const size = 200 + 1 / 3;
    const price = 0.20555555555;

    const params: PlaceOrderParams = {
      side: 'buy',
      symbol: exSymbol.rawSymbol,
      margin,
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
    };
    if (margin) {
      params.marginMode = 'cross';
      params.marginCoin = unifiedSymbol.quote;
    }

    if (params.priceType === 'limit') {
      params.price = round(price, exSymbol.priceDigits);
    }

    if (quoteQuantity) {
      params.quoteAmount = quoteAmount.toFixed(2);
    } else {
      params.baseSize = round(size, exSymbol.baseSizeDigits);
    }

    const exService = restService.getExRest(exAccount);

    const apiKey = apiKeys[exAccount];

    const result = await exService.placeOrder(apiKey, params);
  });
});
