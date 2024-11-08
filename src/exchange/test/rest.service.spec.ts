import { Test } from '@nestjs/testing';
import { ExAccountCode } from '@/db/models/exchange-types';
import { ExchangeModule } from '@/exchange/exchange.module';
import { ExchangeRestService } from '@/exchange/exchange-rest.service';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';

jest.setTimeout(10 * 60 * 1000);

describe('ExchangeRestService', () => {
  let restService: ExchangeRestService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ExchangeModule],
    }).compile();

    await moduleRef.init();

    restService = moduleRef.get(ExchangeRestService);
  });

  describe('-', () => {
    it('okx', async () => {
      const rest = restService.getExRest(ExAccountCode.okxUnified);
      const trades = await rest.getTrades({
        symbol: 'BTC-USDT',
        limit: 20,
      });
      console.log(trades);
    });

    it('binance-spot', async () => {
      const rest = restService.getExRest(ExAccountCode.binanceSpot);
      const trades = await rest.getTrades({
        symbol: 'BTCUSDT',
        limit: 20,
      });
      console.log(trades);
    });

    it('update symbol info - binance', async () => {
      const exAccount = ExAccountCode.binanceSpot;
      const rest = restService.getExRest(exAccount);
      const exSymbols = await ExchangeSymbol.findBy({ exAccount });
      for (const exSymbol of exSymbols) {
        const symbolInfo = await rest.getSymbolInfo(exSymbol.rawSymbol);

        const filters: any[] = symbolInfo.filters;
        // const filterType = quantityByQuote ? 'MARKET_LOT_SIZE' : 'LOT_SIZE';
        const volumeStep: string = filters.find(
          (f) => f.filterType === 'LOT_SIZE',
        )?.stepSize;
        if (volumeStep && volumeStep.includes('.')) {
          exSymbol.volumeStep = volumeStep.replace(/0+$/, '');
        }
        const priceTick: string = filters.find(
          (f) => f.filterType === 'PRICE_FILTER',
        )?.tickSize;
        if (priceTick && priceTick.includes('.')) {
          exSymbol.priceTick = volumeStep.replace(/0+$/, '');
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
        exSymbol.volumeStep = symbolInfo.lotSz;
        exSymbol.priceTick = symbolInfo.minSz;
        exSymbol.exchangeInfo = symbolInfo;
        await ExchangeSymbol.save(exSymbol);
      }
    });
  });
});
