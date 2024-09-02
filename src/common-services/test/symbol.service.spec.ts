import { Test } from '@nestjs/testing';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { SymbolService } from '@/common-services/symbol.service';
import { SymbolConfig } from '@/db/models/symbol-config';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';
import {
  ExAccountCode,
  ExchangeCode,
  ExMarket,
} from '@/exchange/exchanges-types';

describe('SymbolService.spec', () => {
  let service: SymbolService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemConfigModule],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(SymbolService);
  });

  describe('-', () => {
    it('create symbol', async () => {
      const btcUSDTSpot = new SymbolConfig(); //BTC-USDT 现货
      btcUSDTSpot.symbol = 'BTC/USDT';
      btcUSDTSpot.market = ExMarket.spot;
      btcUSDTSpot.base = 'BTC';
      btcUSDTSpot.quote = 'USDT';
      btcUSDTSpot.settle = 'USDT';
      btcUSDTSpot.priceTickStr = '0.1';
      btcUSDTSpot.enabled = true;
      await SymbolConfig.save(btcUSDTSpot);

      const btcBUSDSpot = new SymbolConfig(); //BTC-BUSD 现货
      btcBUSDSpot.symbol = 'BTC/BUSD';
      btcBUSDSpot.market = ExMarket.spot;
      btcBUSDSpot.base = 'BTC';
      btcBUSDSpot.quote = 'BUSD';
      btcBUSDSpot.settle = 'BUSD';
      btcBUSDSpot.priceTickStr = '0.1';
      btcBUSDSpot.enabled = true;
      await SymbolConfig.save(btcBUSDSpot);

      const btcUSDTPerp = new SymbolConfig(); //BTC-USDT 正向永续
      btcUSDTPerp.symbol = 'BTC-PERP/USDT';
      btcUSDTPerp.market = ExMarket.perp;
      btcUSDTPerp.base = 'BTC';
      btcUSDTPerp.quote = 'USDT';
      btcUSDTPerp.settle = 'USDT';
      btcUSDTPerp.priceTickStr = '0.1';
      btcUSDTPerp.enabled = true;
      await SymbolConfig.save(btcUSDTPerp);

      const btcBUSDPerp = new SymbolConfig(); //BTC-BUSD 正向永续
      btcBUSDPerp.symbol = 'BTC-PERP/BUSD';
      btcBUSDPerp.market = ExMarket.perp;
      btcBUSDPerp.base = 'BTC';
      btcBUSDPerp.quote = 'BUSD';
      btcBUSDPerp.settle = 'BUSD';
      btcBUSDPerp.priceTickStr = '0.1';
      btcBUSDPerp.enabled = true;
      await SymbolConfig.save(btcBUSDPerp);

      const btcUSDInverse = new SymbolConfig(); //BTC-USD 反向永续
      btcUSDInverse.symbol = 'BTC-PERP/BTC';
      btcUSDInverse.market = ExMarket.perp_inverse;
      btcUSDInverse.base = 'BTC';
      btcUSDInverse.quote = 'USD';
      btcUSDInverse.settle = 'BTC';
      btcUSDInverse.priceTickStr = '0.1';
      btcUSDInverse.enabled = true;
      await SymbolConfig.save(btcUSDInverse);
    });

    it('create BTC/USD', async () => {
      const btcBUSDSpot = new SymbolConfig(); //BTC-USD 现货
      btcBUSDSpot.symbol = 'BTC/USD';
      btcBUSDSpot.market = ExMarket.spot;
      btcBUSDSpot.base = 'BTC';
      btcBUSDSpot.quote = 'USD';
      btcBUSDSpot.settle = 'USD';
      btcBUSDSpot.priceTickStr = '0.1';
      btcBUSDSpot.enabled = true;
      await SymbolConfig.save(btcBUSDSpot);
    });

    it('create okx', async () => {
      const btcUSDTSpot = new ExchangeSymbol(); //BTC-USDT 现货
      btcUSDTSpot.ex = ExchangeCode.okx;
      btcUSDTSpot.exAccount = ExAccountCode.okxUnified;
      btcUSDTSpot.symbol = 'BTC/USDT';
      btcUSDTSpot.rawSymbol = 'BTC-USDT';
      btcUSDTSpot.priceTickStr = '0.1';
      btcUSDTSpot.enabled = true;
      await ExchangeSymbol.save(btcUSDTSpot);

      const btcUSDTPerp = new ExchangeSymbol(); //BTC-USDT 正向永续
      btcUSDTPerp.ex = ExchangeCode.okx;
      btcUSDTPerp.exAccount = ExAccountCode.okxUnified;
      btcUSDTPerp.symbol = 'BTC-PERP/USDT';
      btcUSDTPerp.rawSymbol = 'BTC-USDT-SWAP';
      btcUSDTPerp.priceTickStr = '0.1';
      btcUSDTPerp.enabled = true;
      await ExchangeSymbol.save(btcUSDTPerp);

      const btcUSDInverse = new ExchangeSymbol(); //BTC-USD 反向永续
      btcUSDInverse.ex = ExchangeCode.okx;
      btcUSDInverse.exAccount = ExAccountCode.okxUnified;
      btcUSDInverse.symbol = 'BTC-PERP/BTC';
      btcUSDInverse.rawSymbol = 'BTC-USD-SWAP';
      btcUSDInverse.priceTickStr = '0.1';
      btcUSDInverse.enabled = true;
      await ExchangeSymbol.save(btcUSDInverse);
    });

    it('create binance', async () => {
      const btcUSDTSpot = new ExchangeSymbol(); //BTC-USDT 现货
      btcUSDTSpot.ex = ExchangeCode.binance;
      btcUSDTSpot.exAccount = ExAccountCode.binanceSpotMargin;
      btcUSDTSpot.symbol = 'BTC/USDT';
      btcUSDTSpot.rawSymbol = 'BTCUSDT';
      btcUSDTSpot.priceTickStr = '0.01';
      btcUSDTSpot.enabled = true;
      await ExchangeSymbol.save(btcUSDTSpot);
      const btcBUSDSpot = new ExchangeSymbol(); //BTC-BUSD 现货
      btcBUSDSpot.ex = ExchangeCode.binance;
      btcBUSDSpot.exAccount = ExAccountCode.binanceSpotMargin;
      btcBUSDSpot.symbol = 'BTC/BUSD';
      btcBUSDSpot.rawSymbol = 'BTCBUSD';
      btcBUSDSpot.priceTickStr = '0.01';
      btcBUSDSpot.enabled = true;
      await ExchangeSymbol.save(btcBUSDSpot);

      const btcUSDTPerp = new ExchangeSymbol(); //BTC-USDT 正向永续
      btcUSDTPerp.ex = ExchangeCode.binance;
      btcUSDTPerp.exAccount = ExAccountCode.binanceUsdM;
      btcUSDTPerp.symbol = 'BTC-PERP/USDT';
      btcUSDTPerp.rawSymbol = 'BTCUSDT';
      btcUSDTPerp.priceTickStr = '0.1';
      btcUSDTPerp.enabled = true;
      await ExchangeSymbol.save(btcUSDTPerp);
      const btcBUSDPerp = new ExchangeSymbol(); //BTC-BUSD 正向永续
      btcBUSDPerp.ex = ExchangeCode.binance;
      btcBUSDPerp.exAccount = ExAccountCode.binanceUsdM;
      btcBUSDPerp.symbol = 'BTC-PERP/BUSD';
      btcBUSDPerp.rawSymbol = 'BTCBUSD';
      btcBUSDPerp.priceTickStr = '0.1';
      btcBUSDPerp.enabled = true;
      await ExchangeSymbol.save(btcBUSDPerp);

      const btcUSDInverse = new ExchangeSymbol(); //BTC-USD 反向永续
      btcUSDInverse.ex = ExchangeCode.binance;
      btcUSDInverse.exAccount = ExAccountCode.binanceCoinM;
      btcUSDInverse.symbol = 'BTC-PERP/BTC';
      btcUSDInverse.rawSymbol = 'BTCUSD_PERP';
      btcUSDInverse.priceTickStr = '0.1';
      btcUSDInverse.enabled = true;
      await ExchangeSymbol.save(btcUSDInverse);
    });

    it('create bitfinex', async () => {
      const btcUSDTSpot = new ExchangeSymbol(); //BTC-USDT 现货
      btcUSDTSpot.ex = ExchangeCode.bitfinex;
      btcUSDTSpot.exAccount = ExAccountCode.bitfinexUnified;
      btcUSDTSpot.symbol = 'BTC/USDT';
      btcUSDTSpot.rawSymbol = 'tBTCUST';
      btcUSDTSpot.priceTickStr = '0.1';
      btcUSDTSpot.enabled = true;
      await ExchangeSymbol.save(btcUSDTSpot);

      const btcUSDSpot = new ExchangeSymbol(); //BTC-USD 现货
      btcUSDSpot.ex = ExchangeCode.bitfinex;
      btcUSDSpot.exAccount = ExAccountCode.bitfinexUnified;
      btcUSDSpot.symbol = 'BTC/USD';
      btcUSDSpot.rawSymbol = 'tBTCUSD';
      btcUSDSpot.priceTickStr = '0.1';
      btcUSDSpot.enabled = true;
      await ExchangeSymbol.save(btcUSDSpot);

      const btcUSDTPerp = new ExchangeSymbol(); //BTC-USDT 正向永续
      btcUSDTPerp.ex = ExchangeCode.bitfinex;
      btcUSDTPerp.exAccount = ExAccountCode.bitfinexUnified;
      btcUSDTPerp.symbol = 'BTC-PERP/USDT';
      btcUSDTPerp.rawSymbol = 'tBTCF0:USTF0';
      btcUSDTPerp.priceTickStr = '0.1';
      btcUSDTPerp.enabled = true;
      await ExchangeSymbol.save(btcUSDTPerp);
    });

    it('create coinbase', async () => {
      const btcUSDSpot = new ExchangeSymbol(); //BTC-USD 现货
      btcUSDSpot.ex = ExchangeCode.coinbase;
      btcUSDSpot.exAccount = ExAccountCode.coinbaseUnified;
      btcUSDSpot.symbol = 'BTC/USD';
      btcUSDSpot.rawSymbol = 'BTC-USD';
      btcUSDSpot.priceTickStr = '0.1';
      btcUSDSpot.enabled = true;
      await ExchangeSymbol.save(btcUSDSpot);
    });

    it('create bybit', async () => {
      // const btcUSDTPerp = new ExchangeSymbol(); //BTC-USDT 正向永续
      // btcUSDTPerp.ex = ExchangeCode.bybit;
      // btcUSDTPerp.exAccount = ExAccountCode.bybitUsdM;
      // btcUSDTPerp.symbol = 'BTC-PERP/USDT';
      // btcUSDTPerp.rawSymbol = 'BTCUSDT';
      // btcUSDTPerp.priceTickStr = '0.1';
      // btcUSDTPerp.enabled = true;
      // await ExchangeSymbol.save(btcUSDTPerp);
      //
      // const btcUSDInverse = new ExchangeSymbol(); //BTC-USD 反向永续
      // btcUSDInverse.ex = ExchangeCode.bybit;
      // btcUSDInverse.exAccount = ExAccountCode.bybitCoinM;
      // btcUSDInverse.symbol = 'BTC-PERP/BTC';
      // btcUSDInverse.rawSymbol = 'BTCUSD';
      // btcUSDInverse.priceTickStr = '0.1';
      // btcUSDInverse.enabled = true;
      // await ExchangeSymbol.save(btcUSDInverse);

      const btcUSDT = new ExchangeSymbol(); //BTC-USDT 现货
      btcUSDT.ex = ExchangeCode.bybit;
      btcUSDT.exAccount = ExAccountCode.bybitSpot;
      btcUSDT.symbol = 'BTC/USDT';
      btcUSDT.rawSymbol = 'BTCUSDT';
      btcUSDT.priceTickStr = '0.01';
      btcUSDT.enabled = true;
      await ExchangeSymbol.save(btcUSDT);

      const ethUSDT = new ExchangeSymbol(); //BTC-USDT 现货
      ethUSDT.ex = ExchangeCode.bybit;
      ethUSDT.exAccount = ExAccountCode.bybitSpot;
      ethUSDT.symbol = 'ETH/USDT';
      ethUSDT.rawSymbol = 'ETHUSDT';
      ethUSDT.priceTickStr = '0.01';
      ethUSDT.enabled = true;
      await ExchangeSymbol.save(ethUSDT);

      const dogeUSDT = new ExchangeSymbol(); //BTC-USDT 现货
      dogeUSDT.ex = ExchangeCode.bybit;
      dogeUSDT.exAccount = ExAccountCode.bybitSpot;
      dogeUSDT.symbol = 'DOGE/USDT';
      dogeUSDT.rawSymbol = 'DOGEUSDT';
      dogeUSDT.priceTickStr = '0.0001';
      dogeUSDT.enabled = true;
      await ExchangeSymbol.save(dogeUSDT);

      const solUSDT = new ExchangeSymbol(); //BTC-USDT 现货
      solUSDT.ex = ExchangeCode.bybit;
      solUSDT.exAccount = ExAccountCode.bybitSpot;
      solUSDT.symbol = 'SOL/USDT';
      solUSDT.rawSymbol = 'SOLUSDT';
      solUSDT.priceTickStr = '0.01';
      solUSDT.enabled = true;
      await ExchangeSymbol.save(solUSDT);
    });

    it('create KuCoin', async () => {
      const btcUSDTSpot = new ExchangeSymbol(); //BTC-USDT 现货
      btcUSDTSpot.ex = ExchangeCode.kucoin;
      btcUSDTSpot.exAccount = ExAccountCode.kucoinSpot;
      btcUSDTSpot.symbol = 'BTC/USDT';
      btcUSDTSpot.rawSymbol = 'BTC-USDT';
      btcUSDTSpot.priceTickStr = '0.1';
      btcUSDTSpot.enabled = true;
      btcUSDTSpot.contractSizeStr = '1';
      await ExchangeSymbol.save(btcUSDTSpot);

      const btcUSDTPerp = new ExchangeSymbol(); //BTC-USDT 正向永续
      btcUSDTPerp.ex = ExchangeCode.kucoin;
      btcUSDTPerp.exAccount = ExAccountCode.kucoinFutures;
      btcUSDTPerp.symbol = 'BTC-PERP/USDT';
      btcUSDTPerp.rawSymbol = 'XBTUSDTM';
      btcUSDTPerp.priceTickStr = '0.1';
      btcUSDTPerp.enabled = true;
      btcUSDTPerp.contractSizeStr = '0.001';
      await ExchangeSymbol.save(btcUSDTPerp);
    });

    it('create BitMEX', async () => {
      const btcUSDTPerp = new ExchangeSymbol(); //BTC-USDT 正向永续
      btcUSDTPerp.ex = ExchangeCode.bitmex;
      btcUSDTPerp.exAccount = ExAccountCode.bitmexUnified;
      btcUSDTPerp.symbol = 'BTC-PERP/USDT';
      btcUSDTPerp.rawSymbol = 'XBTUSDT';
      btcUSDTPerp.priceTickStr = '0.1';
      btcUSDTPerp.enabled = true;
      btcUSDTPerp.contractSizeStr = '0.000001';
      await ExchangeSymbol.save(btcUSDTPerp);

      const btcUSDInverse = new ExchangeSymbol(); //BTC-USD 反向永续
      btcUSDInverse.ex = ExchangeCode.bitmex;
      btcUSDInverse.exAccount = ExAccountCode.bitmexUnified;
      btcUSDInverse.symbol = 'BTC-PERP/BTC';
      btcUSDInverse.rawSymbol = 'XBTUSD';
      btcUSDInverse.priceTickStr = '0.1';
      btcUSDInverse.enabled = true;
      btcUSDInverse.contractSizeStr = '1';
      await ExchangeSymbol.save(btcUSDInverse);
    });

    it('getExchangeAccountSymbols', async () => {
      console.log(await service.getExchangeSymbols());
    });
  });
});
