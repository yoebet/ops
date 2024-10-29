import { Test } from '@nestjs/testing';
import { ExAccountCode } from '@/exchange/exchanges-types';
import { ExchangeModule } from '@/exchange/exchange.module';
import { ExchangeRestService } from '@/exchange/exchange-rest.service';

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
  });
});
