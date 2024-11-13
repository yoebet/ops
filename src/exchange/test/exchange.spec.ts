import { Test } from '@nestjs/testing';
import { ExchangeCode, ExMarket } from '@/db/models/exchange-types';
import { ExchangeModule } from '@/exchange/exchange.module';
import { ExchangeServiceLocator } from '@/exchange/exchange-service-locator';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';

jest.setTimeout(10 * 60 * 1000);

describe('ExchangeService', () => {
  let restService: ExchangeServiceLocator;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ExchangeModule],
    }).compile();

    await moduleRef.init();

    restService = moduleRef.get(ExchangeServiceLocator);
  });

  describe('-', () => {
    it('get latest price', async () => {
      const symbol = 'BTC/USDT';
      const exSymbols = await ExchangeSymbol.findBy({
        symbol,
      });
      const ps = exSymbols
        .map((es) => ({
          es,
          rest: restService.getExMarketDataService(es.ex, es.market),
        }))
        .map(({ es, rest }) =>
          rest.getPrice(es.rawSymbol).then((price) => {
            console.log(`${es}: ${price.last}`);
          }),
        );
      await Promise.all(ps);
    });

    it('update symbol info - binance', async () => {
      const reFetch = false;
      const ex = ExchangeCode.binance;
      const market = ExMarket.spot;
      const rest = restService.getExMarketDataService(ex, market);
      const exSymbols = await ExchangeSymbol.findBy({
        ex,
        market,
      });
      for (const exSymbol of exSymbols) {
        let symbolInfo = exSymbol.exchangeInfo;
        if (reFetch || !symbolInfo) {
          symbolInfo = await rest.getSymbolInfo(exSymbol.rawSymbol);
        }

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
      const reFetch = false;
      const ex = ExchangeCode.okx;
      const market = ExMarket.spot;
      const rest = restService.getExMarketDataService(ex, market);
      const exSymbols = await ExchangeSymbol.findBy({ ex, market });
      for (const exSymbol of exSymbols) {
        let symbolInfo = exSymbol.exchangeInfo;
        if (reFetch || !symbolInfo) {
          symbolInfo = await rest.getSymbolInfo(exSymbol.rawSymbol);
        }

        const sizeStep = symbolInfo.lotSz;
        // exSymbol.baseSizeStep = sizeStep;
        exSymbol.baseSizeDigits = sizeStep.length - (sizeStep.indexOf('.') + 1);

        const priceTick = symbolInfo.tickSz;
        // exSymbol.priceTick = priceTick;
        exSymbol.priceDigits = priceTick.length - (priceTick.indexOf('.') + 1);

        exSymbol.exchangeInfo = symbolInfo;
        await ExchangeSymbol.save(exSymbol);
      }
    });
  });
});
