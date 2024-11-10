import { Test } from '@nestjs/testing';
import { ExAccountCode } from '@/db/models/exchange-types';
import { ExchangeModule } from '@/exchange/exchange.module';
import { ExchangeRestService } from '@/exchange/exchange-rest.service';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';

jest.setTimeout(10 * 60 * 1000);

describe('ExchangeService', () => {
  let restService: ExchangeRestService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ExchangeModule],
    }).compile();

    await moduleRef.init();

    restService = moduleRef.get(ExchangeRestService);
  });

  describe('-', () => {
    it('get latest price', async () => {
      const symbol = 'BTC/USDT';
      const exSymbols = await ExchangeSymbol.findBy({
        symbol,
      });
      const ps = exSymbols
        .map((es) => ({ es, rest: restService.getExRest(es.exAccount) }))
        .map(({ es, rest }) =>
          rest.getPrice(es.rawSymbol).then((price) => {
            console.log(`${es.exAccount}: ${price.last}`);
          }),
        );
      await Promise.all(ps);
    });

    it('update symbol info - binance', async () => {
      const exAccount = ExAccountCode.binanceSpot;
      const rest = restService.getExRest(exAccount);
      const exSymbols = await ExchangeSymbol.findBy({ exAccount });
      for (const exSymbol of exSymbols) {
        const symbolInfo = await rest.getSymbolInfo(exSymbol.rawSymbol);

        const filters: any[] = symbolInfo.filters;

        // const filterType = quantityByQuote ? 'MARKET_LOT_SIZE' : 'LOT_SIZE';
        const sizeStep: string = filters.find(
          (f) => f.filterType === 'LOT_SIZE',
        )?.stepSize;
        if (sizeStep && sizeStep.includes('.')) {
          const ss = sizeStep.replace(/0+$/, '');
          // exSymbol.baseSizeStep = ss;
          exSymbol.baseSizeDigits = ss.length - (ss.indexOf('.') + 1);
        }

        const priceTick: string = filters.find(
          (f) => f.filterType === 'PRICE_FILTER',
        )?.tickSize;
        if (priceTick && priceTick.includes('.')) {
          const pt = priceTick.replace(/0+$/, '');
          // exSymbol.priceTick = pt;
          exSymbol.priceDigits = pt.length - (pt.indexOf('.') + 1);
        }

        exSymbol.exchangeInfo = symbolInfo;
        await ExchangeSymbol.save(exSymbol);
      }
    });

    it('update symbol info - okx', async () => {
      const exAccount = ExAccountCode.okxUnified;
      const rest = restService.getExRest(exAccount);
      const exSymbols = await ExchangeSymbol.findBy({ exAccount });
      for (const exSymbol of exSymbols) {
        const symbolInfo = await rest.getSymbolInfo(exSymbol.rawSymbol);

        const sizeStep = symbolInfo.lotSz;
        // exSymbol.baseSizeStep = sizeStep;
        exSymbol.baseSizeDigits = sizeStep.length - (sizeStep.indexOf('.') + 1);

        const priceTick = symbolInfo.minSz;
        // exSymbol.priceTick = priceTick;
        exSymbol.priceDigits = priceTick.length - (priceTick.indexOf('.') + 1);

        exSymbol.exchangeInfo = symbolInfo;
        await ExchangeSymbol.save(exSymbol);
      }
    });
  });
});
